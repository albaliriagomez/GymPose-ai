from pydantic import BaseModel
from typing import List, Optional


class Coordinate(BaseModel):
    """Coordenada 2D normalizada (0-1)"""
    x: float
    y: float


class AngleData(BaseModel):
    """Datos de un ángulo detectado"""
    name: str          # Ej: "Flexión de Rodilla"
    value: float       # Valor en grados
    target: float      # Valor objetivo
    percent: float     # Porcentaje de cumplimiento


class LandmarkLines(BaseModel):
    """Líneas a dibujar entre landmarks"""
    start: Coordinate
    end: Coordinate
    label: str         # Ej: "shoulder_hip_left"


class PostureAnalysisResponse(BaseModel):
    """Respuesta completa del análisis de postura"""
    success: bool
    angles: List[AngleData]
    landmarks: List[Coordinate]
    lines: List[LandmarkLines]
    recommendations: List[str]
    precision: float           # 0-100
    latency_ms: int
    exercise_type: Optional[str] = None          # Ej: "Sentadilla", "Plancha / Core"
    validation_message: Optional[str] = None     # Razón de fallo o "OK"

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "exercise_type": "Sentadilla",
                "validation_message": "Análisis completado correctamente",
                "angles": [
                    {"name": "Flexión de Rodilla", "value": 92.4, "target": 90.0, "percent": 92.4},
                    {"name": "Inclinación Torso",  "value": 44.2, "target": 45.0, "percent": 44.2}
                ],
                "landmarks": [
                    {"x": 0.3, "y": 0.2},
                    {"x": 0.5, "y": 0.45}
                ],
                "lines": [
                    {"start": {"x": 0.3, "y": 0.2}, "end": {"x": 0.5, "y": 0.45}, "label": "shoulder_hip_left"}
                ],
                "recommendations": [
                    "Distribuye el peso hacia los talones para proteger la articulación."
                ],
                "precision": 98.2,
                "latency_ms": 140
            }
        }