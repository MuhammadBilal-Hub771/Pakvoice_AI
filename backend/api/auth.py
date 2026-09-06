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
    ProfileUpdate,
    UserRole,
    WhatsAppLinkCodeResponse,
    WhatsAppLinkStatus,
)
from core.security import (
    create_access_token,
    decode_access_token,
    blacklist_token,
    get_token_expiry_minutes,
)
from core.dependencies import get_current_user
from db.json_store import (
    authenticate_user,
    create_oauth_user,
    create_user,
    create_whatsapp_link_code,
    get_user_by_email,
    get_user_by_id,
    set_user_whatsapp_phone,
)
from config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# In-memory store for OAuth state (use Redis/DB in production)
_oauth_states: dict = {}


def _get_frontend_url() -> str:
    if settings.FRONTEND_URL and settings.FRONTEND_URL.strip():
        return settings.FRONTEND_URL.strip().rstrip("/")
    origin = settings.ALLOWED_ORIGINS.split(",")[0].strip()
    return origin or "http://localhost:3000"


def _user_response(user) -> UserResponse:
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        city=user.city,
        industry=user.industry,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
        whatsapp_phone=user.whatsapp_phone,
    )


def _issue_token(user) -> str:
    return create_access_token(
        data={
            "sub": user.id,
            "email": user.email,
            "role": user.role.value if hasattr(user.role, "value") else user.role,
            "name": user.name,
            "city": user.city,
        }
    )


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

    access_token = _issue_token(user)

    logger.info(f"User {user.email} logged in as {user.role.value}")

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=_user_response(user),
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

    # Role is fixed server-side. Admins are promoted through the admin panel,
    # never by anything the registration payload can say.
    user = create_user(request, role=UserRole.CLIENT)

    access_token = _issue_token(user)

    logger.info(f"New user registered: {user.email}")

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=_user_response(user),
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
    user = get_user_by_id(current_user.sub)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return _user_response(user)


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update current user profile",
)
async def update_me(
    request: ProfileUpdate,
    current_user=Depends(get_current_user),
):
    from db.json_store import update_user

    user = get_user_by_id(current_user.sub)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    updates = request.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    updated = update_user(current_user.sub, updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile",
        )

    logger.info(f"User {current_user.email} updated profile: {updates}")

    return _user_response(updated)


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
        # This hands out a valid session to anyone who hits the endpoint, so it
        # must never be reachable outside development.
        if not settings.DEBUG:
            logger.error(
                "Google OAuth is not configured and DEBUG is off — refusing "
                "to auto-login"
            )
            return RedirectResponse(
                url=f"{frontend_url}/login?error=oauth_not_configured"
            )

        logger.info("Google OAuth not configured — dev auto-login")

        email = "google_dev@example.com"
        user = get_user_by_email(email)
        if not user:
            user = create_oauth_user(email=email, name="Dev Google User", city="Lahore")
            logger.info(f"Created dev Google user: {email}")

        params = urlencode({
            "token": _issue_token(user),
            "token_type": "bearer",
            "expires_in": get_token_expiry_minutes() * 60,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
        })
        return RedirectResponse(url=f"{frontend_url}/callback?{params}")

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

        user = get_user_by_email(google_email)
        if not user:
            user = create_oauth_user(email=google_email, name=google_name)
            logger.info(f"New user registered via Google: {google_email}")

        if not user.is_active:
            frontend_url = _get_frontend_url()
            return RedirectResponse(url=f"{frontend_url}/login?error=account_disabled")

        frontend_url = _get_frontend_url()
        params = urlencode({
            "token": _issue_token(user),
            "token_type": "bearer",
            "expires_in": get_token_expiry_minutes() * 60,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
        })
        return RedirectResponse(url=f"{frontend_url}/callback?{params}")

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


# === WhatsApp account linking ===


def _whatsapp_digits(display_number: str | None) -> str | None:
    if not display_number:
        return None
    digits = "".join(ch for ch in display_number if ch.isdigit())
    return digits or None


def _whatsapp_wa_link(code: str) -> str | None:
    digits = _whatsapp_digits(settings.WHATSAPP_DISPLAY_NUMBER)
    if not digits:
        return None
    from urllib.parse import quote

    return f"https://wa.me/{digits}?text={quote(code)}"


@router.post(
    "/whatsapp/link-code",
    response_model=WhatsAppLinkCodeResponse,
    summary="Issue a one-time code for linking a WhatsApp number",
)
async def issue_whatsapp_link_code(current_user=Depends(get_current_user)):
    """Generate the code the user sends to the bot to prove the number is theirs.

    Issuing a new code invalidates any previous one for this account.
    """
    if not settings.whatsapp_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "WhatsApp is not configured on the server yet. "
                "Set WHATSAPP_* credentials and restart the backend."
            ),
        )

    record = create_whatsapp_link_code(
        user_id=current_user.sub,
        ttl_minutes=settings.WHATSAPP_LINK_CODE_TTL_MINUTES,
    )

    logger.info(f"WhatsApp link code issued for {current_user.email}")

    display = settings.WHATSAPP_DISPLAY_NUMBER
    return WhatsAppLinkCodeResponse(
        code=record["code"],
        expires_at=record["expires_at"],
        whatsapp_number=display,
        wa_link=_whatsapp_wa_link(record["code"]),
        instructions=(
            f"Send this code to {display or 'our WhatsApp number'} to connect "
            f"your account. It expires in "
            f"{settings.WHATSAPP_LINK_CODE_TTL_MINUTES} minutes."
        ),
    )


@router.get(
    "/whatsapp/status",
    response_model=WhatsAppLinkStatus,
    summary="Check whether a WhatsApp number is linked",
)
async def whatsapp_link_status(current_user=Depends(get_current_user)):
    user = get_user_by_id(current_user.sub)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return WhatsAppLinkStatus(
        linked=bool(user.whatsapp_phone),
        phone=user.whatsapp_phone,
        bot_configured=settings.whatsapp_configured,
        bot_display_number=settings.WHATSAPP_DISPLAY_NUMBER,
    )


@router.delete(
    "/whatsapp/link",
    response_model=WhatsAppLinkStatus,
    summary="Unlink the connected WhatsApp number",
)
async def unlink_whatsapp(current_user=Depends(get_current_user)):
    from db.json_store import delete_whatsapp_session

    user = get_user_by_id(current_user.sub)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.whatsapp_phone:
        # Drop the conversation state too, otherwise the bot would keep
        # answering a number that is no longer authorised.
        delete_whatsapp_session(user.whatsapp_phone)
        set_user_whatsapp_phone(current_user.sub, None)
        logger.info(f"WhatsApp unlinked for {current_user.email}")

    return WhatsAppLinkStatus(
        linked=False,
        phone=None,
        bot_configured=settings.whatsapp_configured,
        bot_display_number=settings.WHATSAPP_DISPLAY_NUMBER,
    )
