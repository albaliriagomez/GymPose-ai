from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import User, Session as GymSession, Repetition
from routers.auth import get_current_user

router = APIRouter(prefix="/sessions", tags=["sessions"])

class SaveSessionRequest(BaseModel):
    exercise: str
    score: float
    duration_seconds: Optional[int] = 0

@router.post("/save")
def save_session(
    body: SaveSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Buscar sesión de hoy o crear una nueva
    session = db.query(GymSession).filter(
        GymSession.user_id == current_user.id,
        GymSession.date >= today_start
    ).first()

    if not session:
        session = GymSession(
            user_id=current_user.id,
            date=now,
            duration_seconds=body.duration_seconds,
            notes="Sesión de entrenamiento en vivo"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
    else:
        session.duration_seconds = (session.duration_seconds or 0) + body.duration_seconds
        db.commit()

    rep = Repetition(
        session_id=session.id,
        exercise=body.exercise,
        score=body.score,
        timestamp=now
    )
    db.add(rep)
    db.commit()

    return {
        "ok": True,
        "session_id": session.id,
        "exercise": body.exercise,
        "score": body.score,
    }