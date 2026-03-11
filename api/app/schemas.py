from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from uuid import UUID
from decimal import Decimal


# =========================================================
# BeerMap - SCHEMAS (Pydantic)
# =========================================================
# Este archivo define los contratos de datos de la API.
#
# Es decir:
# - qué recibe cada endpoint
# - qué devuelve cada endpoint
#
# Esto es importante porque:
# - valida datos automáticamente
# - evita datos basura
# - documenta la API (OpenAPI / Swagger)
# =========================================================


# =========================================================
# AUTH
# =========================================================

class RegisterRequest(BaseModel):
    """
    Datos necesarios para registrar un usuario.
    """
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    """
    Datos necesarios para hacer login.
    """
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """
    Respuesta del endpoint de login.
    """
    access_token: str
    token_type: str = "bearer"


# =========================================================
# GROUPS
# =========================================================

class CreateGroupRequest(BaseModel):
    """
    Crear un grupo nuevo.
    """
    name: str = Field(min_length=3, max_length=80)


class JoinGroupRequest(BaseModel):
    """
    Unirse a un grupo mediante código.
    """
    join_code: str = Field(min_length=4, max_length=10)


class GroupResponse(BaseModel):
    """
    Información básica de un grupo.
    """
    id: UUID
    name: str
    join_code: str


# =========================================================
# CHECKINS
# =========================================================

class CreateCheckinRequest(BaseModel):
    """
    Crear un check-in (una cerveza tomada).
    """
    lat: Decimal
    lng: Decimal

    group_id: Optional[UUID] = None
    icon_id: Optional[UUID] = None
    note: Optional[str] = Field(default=None, max_length=180)


class CheckinResponse(BaseModel):
    """
    Respuesta básica de check-in.
    """
    id: UUID
    lat: Decimal
    lng: Decimal
    note: Optional[str]

class MapCheckinResponse(BaseModel):
    """
    Check-in simplificado para pintar el mapa del usuario.
    """
    id: UUID
    lat: Decimal
    lng: Decimal

# =========================================================
# GROUP CHAT
# =========================================================

class SendMessageRequest(BaseModel):
    """
    Enviar mensaje al chat de un grupo.
    """
    message: str = Field(min_length=1, max_length=500)


class MessageResponse(BaseModel):
    """
    Mensaje del chat.
    """
    id: UUID
    user_id: UUID
    message: str


# =========================================================
# RANKING
# =========================================================

class RankingEntry(BaseModel):
    """
    Entrada del ranking del grupo.
    """
    user_id: UUID
    username: str
    points: int