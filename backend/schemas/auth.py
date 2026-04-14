from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nombre del usuario")
    email: EmailStr = Field(..., description="Correo electrónico único")
    password: str = Field(..., min_length=6, description="Contraseña (mínimo 6 caracteres)")
    weight_kg: Optional[float] = Field(None, gt=0, description="Peso en kilogramos (opcional)")
    height_cm: Optional[float] = Field(None, gt=0, description="Altura en centímetros (opcional)")
    goal: Optional[str] = Field(None, min_length=1, max_length=200, description="Objetivo de entrenamiento (opcional)")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Juan Pérez",
                "email": "juan@example.com",
                "password": "SecurePassword123",
                "weight_kg": 75.5,
                "height_cm": 180,
                "goal": "Aumentar masa muscular"
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
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    goal: Optional[str] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "7e490a24-7c5f-42ff-b4ba-ba714417081e",
                "name": "Juan Pérez",
                "email": "juan@example.com",
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
