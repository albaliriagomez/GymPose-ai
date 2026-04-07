from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from database import get_db
from models import User
from schemas.auth import (
    RegisterRequest,
    LoginRequest,
    UpdateProfileRequest,
    UserResponse,
    TokenResponse
)
from services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def get_current_user(token: str, db: Session = Depends(get_db)) -> User:
    user_id = AuthService.get_user_id_from_token(token)
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


@router.post("/register", response_model=TokenResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    hashed_password = AuthService.hash_password(request.password)
    
    new_user = User(
        name=request.name,
        email=request.email,
        password_hash=hashed_password,
        weight_kg=request.weight_kg,
        height_cm=request.height_cm,
        goal=request.goal
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = AuthService.create_access_token(
        data={"sub": str(new_user.id)}
    )
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(new_user)
    )


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )
    
    if not AuthService.verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )
    
    access_token = AuthService.create_access_token(
        data={"sub": str(user.id)}
    )
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    token: str,
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    return UserResponse.model_validate(user)


@router.put("/me", response_model=UserResponse)
def update_user_profile(
    request: UpdateProfileRequest,
    token: str,
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    
    if request.name is not None:
        user.name = request.name
    if request.weight_kg is not None:
        user.weight_kg = request.weight_kg
    if request.height_cm is not None:
        user.height_cm = request.height_cm
    if request.goal is not None:
        user.goal = request.goal
    
    db.commit()
    db.refresh(user)
    
    return UserResponse.model_validate(user)