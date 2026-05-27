"""
routers/training.py — GymPose
Endpoints del módulo de Plan de Entrenamiento.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession
from typing import Optional

from database import get_db
from models import User
from services.training_service import (
    build_plans,
    build_current_plan_response,
    build_day_progress_response,
    build_routines_progress_response,
    complete_routine_day,
    add_reps_to_current_exercise,
    complete_current_set,
    select_training_plan,
    start_routine_day,
)
from schemas.training import (
    TrainingCurrentResponse,
    TrainingPlan,
    TrainingPlanSelectRequest,
    TrainingExerciseRepRequest,
    TrainingRoutineCompleteRequest,
    TrainingRoutineDayProgressItem,
    TrainingRoutineProgressResponse,
)
from routers.auth import get_current_user

router = APIRouter(prefix="/training", tags=["Training Plan"])


from pydantic import BaseModel


class Recomendacion(BaseModel):
    variante_recomendada: str
    razon: str
    coaching_tip: str


class PlansResponse(BaseModel):
    variantes: dict[str, TrainingPlan]
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


@router.post("/plans/select", response_model=TrainingCurrentResponse, status_code=status.HTTP_201_CREATED)
def select_plan(
    body: TrainingPlanSelectRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    selection = select_training_plan(
        db=db,
        user=current_user,
        plan_variant=body.plan_variant,
        frequency=body.frequency,
    )
    current = build_current_plan_response(db, current_user)
    return TrainingCurrentResponse(**current)


@router.get("/plans/current", response_model=TrainingCurrentResponse)
def get_current_plan(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    current = build_current_plan_response(db, current_user)
    return TrainingCurrentResponse(**current)


@router.get("/routines/current", response_model=TrainingCurrentResponse)
def get_current_routine(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    current = build_current_plan_response(db, current_user)
    return TrainingCurrentResponse(**current)


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


@router.get("/routines/progress", response_model=TrainingRoutineProgressResponse)
def get_routines_progress(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    payload = build_routines_progress_response(db, current_user)
    return TrainingRoutineProgressResponse(**payload)


@router.post("/routines/{day_id}/start", response_model=TrainingRoutineDayProgressItem)
def start_routine(
    day_id: int,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    start_routine_day(db=db, user=current_user, day_number=day_id)
    return TrainingRoutineDayProgressItem(**build_day_progress_response(db, current_user, day_id))


@router.get("/routines/{day_id}/progress", response_model=TrainingRoutineDayProgressItem)
def get_day_progress(
    day_id: int,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    return TrainingRoutineDayProgressItem(**build_day_progress_response(db, current_user, day_id))


@router.post("/routines/{day_id}/exercise/reps", response_model=TrainingRoutineDayProgressItem)
def add_reps(
    day_id: int,
    body: TrainingExerciseRepRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    add_reps_to_current_exercise(db=db, user=current_user, day_number=day_id, reps_count=body.reps_count)
    return TrainingRoutineDayProgressItem(**build_day_progress_response(db, current_user, day_id))


@router.post("/routines/{day_id}/exercise/set-complete", response_model=TrainingRoutineDayProgressItem)
def complete_set(
    day_id: int,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    complete_current_set(db=db, user=current_user, day_number=day_id)
    return TrainingRoutineDayProgressItem(**build_day_progress_response(db, current_user, day_id))


@router.post("/routines/{day_id}/complete", response_model=TrainingRoutineDayProgressItem)
def complete_routine(
    day_id: int,
    body: TrainingRoutineCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    complete_routine_day(
        db=db,
        user=current_user,
        day_number=day_id,
        completed_exercises_count=body.completed_exercises_count,
        total_exercises=body.total_exercises,
    )
    return TrainingRoutineDayProgressItem(**build_day_progress_response(db, current_user, day_id))
