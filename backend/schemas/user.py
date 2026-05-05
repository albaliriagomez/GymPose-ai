from pydantic import BaseModel, EmailStr
from typing import Optional

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    goal: Optional[str] = None
    edad: Optional[int] = None
    sexo: Optional[str] = None
    nivel_actividad: Optional[str] = None
    preferencia_alimentaria: Optional[str] = None
    alergias: Optional[str] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    goal: Optional[str] = None
    name: Optional[str] = None
    edad: Optional[int] = None
    sexo: Optional[str] = None
    nivel_actividad: Optional[str] = None
    preferencia_alimentaria: Optional[str] = None
    alergias: Optional[str] = None

    class Config:
        from_attributes = True
