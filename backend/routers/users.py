from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User
from schemas.user import UserOut, UserUpdate
from routers.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# GET perfil del usuario actual
@router.get("/me", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

# PUT actualizar perfil (peso, altura, meta)
@router.put("/me", response_model=UserOut)
def update_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if data.weight_kg is not None and data.weight_kg <= 0:
        raise HTTPException(status_code=400, detail="El peso debe ser un número positivo")
    if data.height_cm is not None and data.height_cm <= 0:
        raise HTTPException(status_code=400, detail="La altura debe ser un número positivo")

    if data.name is not None:
        current_user.name = data.name
    if data.weight_kg is not None:
        current_user.weight_kg = data.weight_kg
    if data.height_cm is not None:
        current_user.height_cm = data.height_cm
    if data.goal is not None:
        current_user.goal = data.goal
    if data.edad is not None:
        current_user.edad = data.edad
    if data.sexo is not None:
        if data.sexo not in ("masculino", "femenino"):
            raise HTTPException(status_code=400, detail="El sexo debe ser 'masculino' o 'femenino'")
        current_user.sexo = data.sexo

    db.commit()
    db.refresh(current_user)
    return current_user
