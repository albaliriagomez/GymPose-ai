from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import datetime, timedelta
from typing import Optional
from database import get_db
from models import User, Session as GymSession, Repetition, Notification
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

    # Sesiones de ayer
    yesterday = today - timedelta(days=1)
    sessions_yesterday = db.query(GymSession).filter(
        GymSession.user_id == user.id,
        cast(GymSession.date, Date) == yesterday
    ).count()

    # Calorías REALISTAS usando MET + peso + duración real
    # MET promedio ejercicio moderado = 5.0
    # Fórmula: calorias = MET * peso_kg * (duracion_min / 60)
    MET = 5.0
    peso_kg = user.weight_kg or 70.0  # default 70kg si no tiene peso

    sessions_hoy = db.query(GymSession).filter(
        GymSession.user_id == user.id,
        cast(GymSession.date, Date) == today
    ).all()

    calories_today = 0
    for s in sessions_hoy:
        duracion_min = (s.duration_seconds or 1800) / 60  # default 30 min
        calories_today += MET * peso_kg * (duracion_min / 60)

    calories_today = round(calories_today)

    # MET por tipo de ejercicio desde repetitions
    MET_MAP = {
        "Sentadilla":       6.0,
        "Lunges / Zancada": 5.5,
        "Peso Muerto":      6.0,
        "Plancha / Core":   4.0,
        "De pie / Parado":  2.5,
        "Postura detectada": 4.0,
    }

    # Recalcular calorías con MET específico por ejercicio
    calories_today = 0
    for s in sessions_hoy:
        duracion_min = (s.duration_seconds or 1800) / 60
        # Buscar el ejercicio de esa sesión
        rep = db.query(Repetition).filter(
            Repetition.session_id == s.id
        ).first()
        met = MET_MAP.get(rep.exercise if rep else "", 5.0)
        calories_today += met * peso_kg * (duracion_min / 60)

    calories_today = round(calories_today)

    # Meta de calorías personalizada según nivel de actividad
    nivel = user.nivel_actividad or ""
    if "Muy activo" in nivel:
        calories_goal = 800
    elif "Activo" in nivel:
        calories_goal = 700
    elif "Moderado" in nivel:
        calories_goal = 600
    elif "Ligero" in nivel:
        calories_goal = 500
    else:
        calories_goal = 400

    # Consistencia semanal
    week_start = today - timedelta(days=6)
    days_with_session = db.query(
        cast(GymSession.date, Date)
    ).filter(
        GymSession.user_id == user.id,
        cast(GymSession.date, Date) >= week_start
    ).distinct().count()
    consistency = round((days_with_session / 7) * 100)

    if sessions_yesterday == 0:
        sessions_change = 100 if sessions_today > 0 else 0
    else:
        sessions_change = round(
            ((sessions_today - sessions_yesterday) / sessions_yesterday) * 100
        )

    return {
        "sessions_today":   sessions_today,
        "sessions_change":  sessions_change,
        "calories_today":   calories_today,
        "calories_goal":    calories_goal,
        "consistency_pct":  consistency,
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
    peso_kg = user.weight_kg or 70.0

    MET_MAP = {
        "Sentadilla":        6.0,
        "Lunges / Zancada":  5.5,
        "Peso Muerto":       6.0,
        "Plancha / Core":    4.0,
        "De pie / Parado":   2.5,
        "Postura detectada": 4.0,
    }

    rows = db.query(
        cast(GymSession.date, Date).label("day"),
        func.count(GymSession.id).label("sessions"),
        func.sum(GymSession.duration_seconds).label("total_seconds")
    ).filter(
        GymSession.user_id == user.id,
        cast(GymSession.date, Date) >= week_start
    ).group_by(cast(GymSession.date, Date)).all()

    sessions_by_day = {
        str(r.day): {
            "sessions": r.sessions,
            "duration": r.total_seconds or 0
        } for r in rows
    }

    # Obtener ejercicios de la semana
    reps_week = (
        db.query(Repetition, GymSession)
        .join(GymSession, Repetition.session_id == GymSession.id)
        .filter(
            GymSession.user_id == user.id,
            cast(GymSession.date, Date) >= week_start
        ).all()
    )

    # Agrupar MET por día
    met_by_day = {}
    for rep, session in reps_week:
        day_str = str(session.date.date())
        met_by_day[day_str] = MET_MAP.get(rep.exercise or "", 5.0)

    days_labels = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"]
    result = []
    for i in range(7):
        day = week_start + timedelta(days=i)
        day_str = str(day)
        day_data = sessions_by_day.get(day_str, {"sessions": 0, "duration": 0})
        duracion_min = day_data["duration"] / 60
        met = met_by_day.get(day_str, 5.0)
        calories = round(met * peso_kg * (duracion_min / 60)) if duracion_min > 0 else 0
        intensity = min(100, day_data["sessions"] * 40 + int(duracion_min))
        result.append({
            "day":      days_labels[day.weekday()],
            "date":     day_str,
            "intensity": intensity,
            "calories":  calories,
            "sessions":  day_data["sessions"],
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
        "score": round(last_rep.score, 1),
        "timestamp": last_rep.timestamp,
        "session_id": last_rep.session_id,
    }


@router.get("/tips")
def get_dashboard_tips(
    token: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(token=token, authorization=authorization, db=db)

    consejo = (
        db.query(Notification)
        .filter(
            Notification.user_id == user.id,
            Notification.type == "consejo"
        )
        .order_by(Notification.created_at.desc())
        .first()
    )

    record = (
        db.query(Notification)
        .filter(
            Notification.user_id == user.id,
            Notification.type == "record"
        )
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