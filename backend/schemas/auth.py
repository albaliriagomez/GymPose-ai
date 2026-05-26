from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Literal, Optional
from uuid import UUID

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nombre del usuario")
    email: EmailStr = Field(..., description="Correo electrónico único")
    password: str = Field(..., min_length=6, description="Contraseña (mínimo 6 caracteres)")
    weight_kg: Optional[float] = Field(None, gt=0, description="Peso en kilogramos (opcional)")
    height_cm: Optional[float] = Field(None, gt=0, description="Altura en centímetros (opcional)")
    goal: Optional[str] = Field(None, min_length=1, max_length=200, description="Objetivo de entrenamiento (opcional)")
    role: Literal["user", "trainer"] = Field("user", description="Rol del usuario")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Juan Pérez",
                "email": "juan@example.com",
                "password": "SecurePassword123",
                "weight_kg": 75.5,
                "height_cm": 180,
                "goal": "Aumentar masa muscular",
                "role": "user"
            }
        }


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Correo electrónico registrado")
    password: str = Field(..., description="Contraseña del usuario")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "juan@example.com",
                "password": "SecurePassword123"
            }
        }


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    weight_kg: Optional[float] = Field(None, gt=0)
    height_cm: Optional[float] = Field(None, gt=0)
    goal: Optional[str] = Field(None, min_length=1, max_length=200)
    edad: Optional[int] = Field(None, gt=0, lt=120)
    sexo: Optional[str] = Field(None, pattern="^(masculino|femenino)$")
    nivel_actividad: Optional[str] = None
    preferencia_alimentaria: Optional[str] = None
    alergias: Optional[str] = None
    trainer_id: Optional[UUID] = None

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Juan Pérez",
                "weight_kg": 76.0,
                "height_cm": 180,
                "goal": "Aumentar masa muscular y mejorar resistencia"
            }
        }


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    role: str = "user"
    trainer_id: Optional[UUID] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    goal: Optional[str] = None
    edad: Optional[int] = None
    sexo: Optional[str] = None
    nivel_actividad: Optional[str] = None
    preferencia_alimentaria: Optional[str] = None
    alergias: Optional[str] = None

    @field_validator("role", mode="before")
    @classmethod
    def default_role(cls, value):
        return value or "user"

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "7e490a24-7c5f-42ff-b4ba-ba714417081e",
                "name": "Juan Pérez",
                "email": "juan@example.com",
                "role": "user",
                "weight_kg": 75.5,
                "height_cm": 180,
                "goal": "Aumentar masa muscular"
            }
        }


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "user": {
                    "id": 1,
                    "name": "Juan Pérez",
                    "email": "juan@example.com",
                    "weight_kg": 75.5,
                    "height_cm": 180,
                    "goal": "Aumentar masa muscular"
                }
            }
        }
