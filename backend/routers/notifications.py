from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Notification, User
from schemas.notifications import NotificationOut
from routers.auth import get_current_user
from typing import List

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/", response_model=List[NotificationOut])
def get_notifications(
    token: str,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(token, db)
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )

@router.get("/unread-count")
def get_unread_count(
    token: str,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(token, db)
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.read == False)
        .count()
    )
    return {"unread": count}

@router.patch("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    token: str,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(token, db)
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    notif.read = True
    db.commit()
    return {"ok": True}

@router.patch("/read-all")
def mark_all_read(
    token: str,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(token, db)
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False
    ).update({"read": True})
    db.commit()
    return {"ok": True}