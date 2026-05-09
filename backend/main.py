from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError

from models import User, Session, Repetition, Nutrition, Notification
from routers import auth, posture, notifications, users, nutrition, dashboard, training 

import init_db

app = FastAPI(title="GymPose AI API", version="1.0.0")

origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(nutrition.router)
app.include_router(posture.router)
app.include_router(notifications.router)
app.include_router(users.router)
app.include_router(dashboard.router)
app.include_router(training.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "database": "connected", "version": "1.0.0"}

@app.on_event("startup")
async def startup():
    try:
        init_db.create_tables()
        print("Backend iniciado correctamente")
    except OperationalError as exc:
        print(f"Error conectando a la base de datos: {exc}")
        raise

@app.on_event("shutdown")
async def shutdown():
    print("Backend cerrado")
