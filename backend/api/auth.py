import secrets
from datetime import timedelta, datetime, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from loguru import logger

from models.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    TokenRefreshRequest,
    UserRole,
)
from core.security import (
    create_access_token,
    decode_access_token,
    blacklist_token,
    get_token_expiry_minutes,
)
from core.dependencies import get_current_user
from db.json_store import authenticate_user, create_user, get_user_by_email, _read_json, _write_json
from config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# In-memory store for OAuth state (use Redis/DB in production)
_oauth_states: dict = {}


def _get_frontend_url() -> str:
    """Derive frontend URL from allowed origins config."""
    origin = settings.ALLOWED_ORIGINS.split(",")[0].strip()
    return origin or "http://localhost:3000"


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login with email and password",
)
async def login(request: UserLogin):
    user = authenticate_user(
        email=request.email,
        password=request.password,
        role=request.role.value,
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email, password, or role",
        )

    access_token = create_access_token(
        data={
            "sub": user.id,
            "email": user.email,
            "role": user.role.value,
            "name": user.name,
            "city": user.city,
        }
    )

    logger.info(f"User {user.email} logged in as {user.role.value}")

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            city=user.city,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
        ),
        expires_in=get_token_expiry_minutes() * 60,
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    summary="Register a new user",
)
async def register(request: UserCreate):
    existing = get_user_by_email(request.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = create_user(request)

    access_token = create_access_token(
        data={
            "sub": user.id,
            "email": user.email,
            "role": user.role.value,
            "name": user.name,
            "city": user.city,
        }
    )

    logger.info(f"New user registered: {user.email}")

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            city=user.city,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
        ),
        expires_in=get_token_expiry_minutes() * 60,
    )


@router.post(
    "/refresh",
    summary="Refresh JWT token",
)
async def refresh_token(request: TokenRefreshRequest):
    try:
        payload = decode_access_token(request.token)
        new_token = create_access_token(
            data={
                "sub": payload.get("sub"),
                "email": payload.get("email"),
                "role": payload.get("role"),
                "name": payload.get("name"),
                "city": payload.get("city"),
            }
        )
        return {
            "access_token": new_token,
            "token_type": "bearer",
            "expires_in": get_token_expiry_minutes() * 60,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token",
        )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user from JWT",
)
async def get_me(current_user=Depends(get_current_user)):
    from db.json_store import get_user_by_id

    user = get_user_by_id(current_user.sub)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        city=user.city,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )


_bearer = HTTPBearer()

@router.get(
    "/google",
    summary="Login with Google (redirect to Google OAuth)",
)
async def google_login():
    """Redirect user to Google OAuth consent screen.

    When GOOGLE_CLIENT_ID is not configured, automatically logs in
    as a test client user for development convenience.
    """
    frontend_url = _get_frontend_url()

    # --- Dev mode: auto-login fallback ---
    if not settings.GOOGLE_CLIENT_ID:
        logger.info("Google OAuth not configured — dev auto-login")

        # Find or create a dev Google user
        users = _read_json("./data/users.json")
        email = "google_dev@example.com"
        user = next((u for u in users if u.get("email") == email), None)

        if not user:
            from uuid import uuid4
            from datetime import datetime, timezone

            now = datetime.now(timezone.utc)
            user = {
                "id": str(uuid4()),
                "name": "Dev Google User",
                "email": email,
                "city": "Lahore",
                "role": "client",
                "hashed_password": "",
                "is_active": True,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }
            users.append(user)
            _write_json("./data/users.json", users)
            logger.info(f"Created dev Google user: {email}")

        # Issue JWT
        access_token = create_access_token(
            data={
                "sub": user["id"],
                "email": user["email"],
                "role": user["role"],
                "name": user["name"],
                "city": user.get("city", "Lahore"),
            }
        )

        params = urlencode({
            "token": access_token,
            "token_type": "bearer",
            "expires_in": get_token_expiry_minutes() * 60,
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
        })
        redirect_url = f"{frontend_url}/callback?{params}"
        logger.info(f"Dev Google OAuth redirect: {redirect_url}")
        return RedirectResponse(url=redirect_url)

    # --- Real Google OAuth flow ---
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = {"created_at": datetime.now(timezone.utc)}

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    google_auth_url = f"https://accounts.google.com/o/oauth2/auth?{urlencode(params)}"
    return RedirectResponse(url=google_auth_url)


@router.get(
    "/google/callback",
    summary="Google OAuth callback",
)
async def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
):
    """Handle the Google OAuth callback.

    In dev mode this endpoint is not used (auto-login handles it).
    In production, this exchanges the auth code for tokens and creates/logs in the user.
    """
    if error:
        logger.warning(f"Google OAuth error: {error}")
        frontend_url = _get_frontend_url()
        return RedirectResponse(url=f"{frontend_url}/login?error={error}")

    if not settings.GOOGLE_CLIENT_ID:
        # Should not be reached in dev mode
        frontend_url = _get_frontend_url()
        return RedirectResponse(url=f"{frontend_url}/login?error=oauth_disabled")

    # Validate state
    if not state or state not in _oauth_states:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OAuth state",
        )
    del _oauth_states[state]

    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing authorization code",
        )

    # Exchange code for access token
    import httpx

    try:
        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
                headers={"Accept": "application/json"},
            )
            token_data = token_resp.json()

        if "access_token" not in token_data:
            logger.error(f"Google token exchange failed: {token_data}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange Google auth code",
            )

        # Fetch user info from Google
        async with httpx.AsyncClient() as client:
            user_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            google_user = user_resp.json()

        google_email = google_user.get("email")
        google_name = google_user.get("name", "Google User")

        if not google_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google account has no email",
            )

        # Find or create user
        users = _read_json("./data/users.json")
        existing = next((u for u in users if u.get("email") == google_email), None)

        if existing:
            user = existing
        else:
            from uuid import uuid4

            now = datetime.now(timezone.utc)
            user = {
                "id": str(uuid4()),
                "name": google_name,
                "email": google_email,
                "city": "",
                "role": "client",
                "hashed_password": "",
                "is_active": True,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }
            users.append(user)
            _write_json("./data/users.json", users)
            logger.info(f"New user registered via Google: {google_email}")

        # Issue JWT
        access_token = create_access_token(
            data={
                "sub": user["id"],
                "email": user["email"],
                "role": user["role"],
                "name": user["name"],
                "city": user.get("city", ""),
            }
        )

        frontend_url = _get_frontend_url()
        params = urlencode({
            "token": access_token,
            "token_type": "bearer",
            "expires_in": get_token_expiry_minutes() * 60,
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
        })
        redirect_url = f"{frontend_url}/callback?{params}"
        return RedirectResponse(url=redirect_url)

    except httpx.RequestError as e:
        logger.error(f"Google OAuth HTTP error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to communicate with Google",
        )

@router.post(
    "/logout",
    summary="Logout and blacklist token",
)
async def logout(
    current_user=Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
):
    blacklist_token(credentials.credentials)
    logger.info(f"User {current_user.email} logged out")
    return {"message": "Logged out successfully"}
