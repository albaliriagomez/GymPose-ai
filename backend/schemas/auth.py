from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nombre del usuario")
    email: EmailStr = Field(..., description="Correo electronico unico")
    password: str = Field(..., min_length=6, description="Contrasena (minimo 6 caracteres)")
    weight_kg: Optional[float] = Field(None, gt=0, description="Peso en kilogramos")
    height_cm: Optional[float] = Field(None, gt=0, description="Altura en centimetros")
    goal: Optional[str] = Field(None, min_length=1, max_length=200, description="Objetivo de entrenamiento")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Juan Perez",
                "email": "juan@example.com",
                "password": "SecurePassword123",
                "weight_kg": 75.5,
                "height_cm": 180,
                "goal": "Aumentar masa muscular"
            }
        }


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Correo electronico registrado")
    password: str = Field(..., description="Contrasena del usuario")

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
                "name": "Juan Perez",
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
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Juan Perez",
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
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "name": "Juan Perez",
                    "email": "juan@example.com",
                    "weight_kg": 75.5,
                    "height_cm": 180,
                    "goal": "Aumentar masa muscular"
                }
            }
        }
