from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import datetime, timedelta
from typing import Optional
from database import get_db
from models import User, Session as GymSession, Repetition
from routers.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats")
def get_dashboard_stats(
    token: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(token=token, authorization=authorization, db=db)
    today = datetime.utcnow().date()

    # Sesiones de hoy
    sessions_today = db.query(GymSession).filter(
        GymSession.user_id == user.id,
        cast(GymSession.date, Date) == today
    ).count()

    # Sesiones de ayer (para el % de cambio)
    yesterday = today - timedelta(days=1)
    sessions_yesterday = db.query(GymSession).filter(
        GymSession.user_id == user.id,
        cast(GymSession.date, Date) == yesterday
    ).count()

    # Calorías hoy (estimamos 400 cal por sesión si no hay campo directo)
    calories_today = sessions_today * 400

    # Consistencia semanal: días con sesión / 7
    week_start = today - timedelta(days=6)
    days_with_session = db.query(
        cast(GymSession.date, Date)
    ).filter(
        GymSession.user_id == user.id,
        cast(GymSession.date, Date) >= week_start
    ).distinct().count()
    consistency = round((days_with_session / 7) * 100)

    # % cambio sesiones
    if sessions_yesterday == 0:
        sessions_change = 100 if sessions_today > 0 else 0
    else:
        sessions_change = round(((sessions_today - sessions_yesterday) / sessions_yesterday) * 100)

    return {
        "sessions_today": sessions_today,
        "sessions_change": sessions_change,
        "calories_today": calories_today,
        "calories_goal": 1200,
        "consistency_pct": consistency,
        "days_with_session": days_with_session,
    }


@router.get("/weekly")
def get_weekly_summary(
    token: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(token=token, authorization=authorization, db=db)
    today = datetime.utcnow().date()
    week_start = today - timedelta(days=6)

    # Sesiones agrupadas por día
    rows = db.query(
        cast(GymSession.date, Date).label("day"),
        func.count(GymSession.id).label("sessions"),
        func.sum(GymSession.duration_seconds).label("total_seconds")
    ).filter(
        GymSession.user_id == user.id,
        cast(GymSession.date, Date) >= week_start
    ).group_by(cast(GymSession.date, Date)).all()

    sessions_by_day = {str(r.day): {"sessions": r.sessions, "duration": r.total_seconds or 0} for r in rows}

    days_labels = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"]
    result = []
    for i in range(7):
        day = week_start + timedelta(days=i)
        day_str = str(day)
        day_data = sessions_by_day.get(day_str, {"sessions": 0, "duration": 0})
        intensity = min(100, day_data["sessions"] * 40 + (day_data["duration"] // 60))
        calories = day_data["sessions"] * 400
        result.append({
            "day": days_labels[day.weekday()],
            "date": day_str,
            "intensity": intensity,
            "calories": calories,
            "sessions": day_data["sessions"],
        })

    return result


@router.get("/last-analysis")
def get_last_analysis(
    token: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(token=token, authorization=authorization, db=db)

    last_rep = (
        db.query(Repetition)
        .join(GymSession, Repetition.session_id == GymSession.id)
        .filter(GymSession.user_id == user.id)
        .order_by(Repetition.timestamp.desc())
        .first()
    )

    if not last_rep:
        return {"found": False}

    return {
        "found": True,
        "exercise": last_rep.exercise,
        "score": last_rep.score,
        "timestamp": last_rep.timestamp,
    }
from models import Notification

@router.get("/tips")
def get_dashboard_tips(
    token: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(token=token, authorization=authorization, db=db)

    consejo = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.type == "consejo")
        .order_by(Notification.created_at.desc())
        .first()
    )
    record = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.type == "record")
        .order_by(Notification.created_at.desc())
        .first()
    )

    return {
        "consejo": {
            "message": consejo.message if consejo else "Mantén una buena hidratación durante el entrenamiento.",
            "found": consejo is not None
        },
        "record": {
            "message": record.message if record else "¡Completa tu primera sesión para registrar tu primer récord!",
            "found": record is not None
        }
    }
