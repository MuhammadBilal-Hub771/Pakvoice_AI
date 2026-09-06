from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    CLIENT = "client"


class UserBase(BaseModel):
    """Fields shared by request and response shapes.

    ``role`` is deliberately absent: it lives only on the models the server
    produces (UserResponse, UserInDB). Keeping it off the inbound shapes is
    what stops a registration payload from asking for an admin account.

    ``city`` allows an empty value because Google OAuth accounts are created
    before the user has picked one.
    """

    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    city: str = Field(default="", max_length=100)
    industry: Optional[str] = Field(None, max_length=100)


class UserCreate(UserBase):
    # Self-service registration does require a city.
    city: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: str
    password: str
    role: UserRole


class UserResponse(UserBase):
    id: str
    role: UserRole = UserRole.CLIENT
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None
    whatsapp_phone: Optional[str] = None

    class Config:
        from_attributes = True


class UserInDB(UserBase):
    id: str
    hashed_password: str
    role: UserRole = UserRole.CLIENT
    is_active: bool = True
    whatsapp_phone: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    expires_in: int


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    industry: Optional[str] = Field(None, max_length=100)


class TokenRefreshRequest(BaseModel):
    token: str


class TokenPayload(BaseModel):
    sub: str
    exp: int
    role: str
    email: str


class WhatsAppLinkCodeResponse(BaseModel):
    code: str
    expires_at: datetime
    whatsapp_number: Optional[str] = None
    # Pre-filled wa.me deep link so the UI can open WhatsApp in one tap.
    wa_link: Optional[str] = None
    instructions: str


class WhatsAppLinkStatus(BaseModel):
    linked: bool
    phone: Optional[str] = None
    # Lets the profile UI explain setup without exposing secrets.
    bot_configured: bool = False
    bot_display_number: Optional[str] = None
