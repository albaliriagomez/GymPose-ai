"""
routers/training.py — GymPose
Endpoints del módulo de Plan de Entrenamiento.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import User
from services.training_service import build_plans
from schemas.training import TrainingPlan
from routers.auth import get_current_user

router = APIRouter(prefix="/training", tags=["Training Plan"])


# ── Schemas de respuesta ──────────────────────────────────────────────────────

class Recomendacion(BaseModel):
    variante_recomendada: str          # "A" | "B" | "C"
    razon: str
    coaching_tip: str


class PlansResponse(BaseModel):
    variantes: dict[str, TrainingPlan]  # {"A": plan, "B": plan, "C": plan}
    recomendacion: Recomendacion


# ── Endpoint principal ────────────────────────────────────────────────────────

@router.get("/plans", response_model=PlansResponse)
def get_training_plans(
    frequency: str = "media",
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """
    Genera las 3 variantes de plan (A/B/C) más la recomendación IA via Groq.
    frequency: "baja" | "media" | "alta"
    """
    if not current_user.goal:
        raise HTTPException(
            status_code=400,
            detail="Debes configurar tu meta en el perfil antes de generar un plan.",
        )

    if frequency not in ("baja", "media", "alta"):
        raise HTTPException(
            status_code=400,
            detail="frequency debe ser 'baja', 'media' o 'alta'",
        )

    result = build_plans(
        goal=current_user.goal,
        frequency=frequency,
        weight_kg=current_user.weight_kg,
        height_cm=current_user.height_cm,
        nivel_actividad=getattr(current_user, "nivel_actividad", None),
        edad=getattr(current_user, "edad", None),
        sexo=getattr(current_user, "sexo", None),
    )

    return PlansResponse(
        variantes=result["variantes"],
        recomendacion=Recomendacion(**result["recomendacion"]),
    )


# ── Backward-compatible: mantiene /plan para no romper clientes existentes ───

@router.get("/plan", response_model=TrainingPlan)
def get_training_plan(
    frequency: str = "media",
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """
    Deprecated: usa /plans para obtener las 3 variantes.
    Este endpoint sigue funcionando y retorna la Variante A.
    """
    if not current_user.goal:
        raise HTTPException(
            status_code=400,
            detail="Debes configurar tu meta en el perfil antes de generar un plan.",
        )

    if frequency not in ("baja", "media", "alta"):
        raise HTTPException(
            status_code=400,
            detail="frequency debe ser 'baja', 'media' o 'alta'",
        )

    result = build_plans(
        goal=current_user.goal,
        frequency=frequency,
        weight_kg=current_user.weight_kg,
        height_cm=current_user.height_cm,
    )
    return result["variantes"]["A"]