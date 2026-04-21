from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from database import get_db
from models import User, Session as GymSession, Repetition
from services.posture_service import posture_analyzer
from schemas.posture import PostureAnalysisResponse
from routers.auth import get_current_user

router = APIRouter(prefix="/posture", tags=["posture"])


@router.post("/analyze", response_model=PostureAnalysisResponse)
async def analyze_posture(
    token: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato no soportado. Usa JPG o PNG."
        )

    image_bytes = await file.read()

    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="La imagen excede el tamaño máximo de 10MB."
        )

    try:
        result = posture_analyzer.analyze_image(image_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar la imagen: {str(e)}"
        )

    if result.success:
        try:
            user = get_current_user(token, db)
            now = datetime.utcnow()

            # Buscar sesión de hoy comparando solo la fecha (sin cast problemático)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            session = db.query(GymSession).filter(
                GymSession.user_id == user.id,
                GymSession.date >= today_start
            ).first()

            if not session:
                session = GymSession(
                    user_id=user.id,
                    date=now,
                    duration_seconds=0,
                    notes="Sesión de análisis de postura"
                )
                db.add(session)
                db.commit()
                db.refresh(session)

            rep = Repetition(
                session_id=session.id,
                exercise=result.exercise_type or "Postura detectada",
                score=result.precision,
                timestamp=now
            )
            db.add(rep)
            db.commit()
            print(f"✅ Repetición guardada: {result.exercise_type} ({result.precision}%)")

        except Exception as e:
            print(f"❌ Error guardando en BD: {e}")

    return result