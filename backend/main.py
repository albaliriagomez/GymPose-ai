from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from models import User, Session, Repetition, Nutrition
from routers import auth
import init_db

Base.metadata.create_all(bind=engine)

app = FastAPI(title="GymPose AI API", version="1.0.0")

origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "database": "connected", "version": "1.0.0"}

@app.on_event("startup")
async def startup():
    init_db.create_tables()
    print("Backend iniciado correctamente")

@app.on_event("shutdown")
async def shutdown():
    print("Backend cerrado")