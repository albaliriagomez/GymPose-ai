from pydantic import BaseModel
from datetime import datetime
from typing import Literal

class NotificationOut(BaseModel):
    id: int
    type: str
    message: str
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True