from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user
from schemas.progress import (
    ProgressGenerateRequest,
    ProgressLogCreate,
    ProgressLogResponse,
    ProgressPlanResponse,
    ProgressSummaryResponse,
)
from services import progress_service

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/plan", response_model=ProgressPlanResponse)
def get_plan(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    plan = progress_service.get_plan(db, current_user)
    return ProgressPlanResponse.model_validate(progress_service.plan_to_response(plan))


@router.post("/generate", response_model=ProgressPlanResponse)
def generate_plan(
    body: ProgressGenerateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    plan = progress_service.generate_progress_plan(db, current_user, request=body, force_refresh=True)
    return ProgressPlanResponse.model_validate(progress_service.plan_to_response(plan))


@router.get("/summary", response_model=ProgressSummaryResponse)
def get_summary(
    period: str = Query("weekly", pattern="^(weekly|monthly)$"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    summary = progress_service.build_summary(db, current_user, period=period)
    return ProgressSummaryResponse(**summary)


@router.post("/log", response_model=ProgressLogResponse, status_code=status.HTTP_201_CREATED)
def log_progress(
    body: ProgressLogCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    log = progress_service.create_progress_log(db, current_user, body)
    return ProgressLogResponse.model_validate(log)
