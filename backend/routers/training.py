from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from database import get_db
from models import User
from services.training_service import build_plan
from schemas.training import TrainingPlan, FrequencyRequest
from routers.auth import get_current_user

router = APIRouter(prefix="/training", tags=["Training Plan"])


@router.get("/plan", response_model=TrainingPlan)
def get_training_plan(
    frequency: str = "media",
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """
    Genera un plan de entrenamiento basado en el perfil del usuario.
    frequency: "baja" | "media" | "alta"
    """
    if not current_user.goal:
        raise HTTPException(
            status_code=400,
            detail="Debes configurar tu meta en el perfil antes de generar un plan."
        )

    if frequency not in ("baja", "media", "alta"):
        raise HTTPException(status_code=400, detail="frequency debe ser 'baja', 'media' o 'alta'")

    plan = build_plan(
        goal=current_user.goal,
        frequency=frequency,
        weight_kg=current_user.weight_kg,
        height_cm=current_user.height_cm,
    )
    return plan