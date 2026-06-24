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
    user = TokenPayload(
        sub=payload.get("sub"),
        exp=payload.get("exp"),
        role=payload.get("role"),
        email=payload.get("email"),
    )
    return user


async def require_admin(
    current_user: TokenPayload = Depends(get_current_user),
) -> TokenPayload:
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
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
        return TokenPayload(
            sub=payload.get("sub"),
            exp=payload.get("exp"),
            role=payload.get("role"),
            email=payload.get("email"),
        )
    except HTTPException:
        return None
