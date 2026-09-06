from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from core.security import decode_access_token
from models.user import TokenPayload, UserRole

security_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> TokenPayload:
    token = credentials.credentials
    payload = decode_access_token(token)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # The JWT alone is not enough: a suspended or deleted account would keep
    # working until its token expired. Role comes from the database too, so
    # revoking admin takes effect immediately rather than at next login.
    from db.json_store import get_user_by_id

    user = get_user_by_id(sub)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    return TokenPayload(
        sub=sub,
        exp=payload.get("exp"),
        role=user.role.value,
        email=user.email,
    )


async def require_admin(
    current_user: TokenPayload = Depends(get_current_user),
) -> TokenPayload:
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


async def require_client(
    current_user: TokenPayload = Depends(get_current_user),
) -> TokenPayload:
    if current_user.role != UserRole.CLIENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This agent is available to client accounts only",
        )
    return current_user


async def optional_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
) -> Optional[TokenPayload]:
    if credentials is None:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        sub = payload.get("sub")
        if not sub:
            return None

        from db.json_store import get_user_by_id

        user = get_user_by_id(sub)
        if user is None or not user.is_active:
            return None

        return TokenPayload(
            sub=sub,
            exp=payload.get("exp"),
            role=user.role.value,
            email=user.email,
        )
    except HTTPException:
        return None
