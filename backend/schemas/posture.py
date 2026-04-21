from pydantic import BaseModel
from typing import List, Optional

class Coordinate(BaseModel):
    """Coordenada 2D normalizada (0-1)"""
    x: float
    y: float

class AngleData(BaseModel):
    """Datos de un ángulo detectado"""
    name: str  # Ej: "knee_flexion", "torso_inclination"
    value: float  # Valor en grados
    target: float  # Valor objetivo
    percent: float  # Porcentaje de cumplimiento
    
class LandmarkLines(BaseModel):
    """Líneas a dibujar entre landmarks"""
    start: Coordinate
    end: Coordinate
    label: str  # Ej: "shoulder_hip", "hip_knee"

class PostureAnalysisResponse(BaseModel):
    """Respuesta completa del análisis de postura"""
    success: bool
    angles: List[AngleData]
    landmarks: List[Coordinate]  # Puntos clave detectados
    lines: List[LandmarkLines]  # Líneas a dibujar
    recommendations: List[str]  # Sugerencias
    precision: float  # Precisión del análisis (0-100)
    latency_ms: int  # Tiempo de procesamiento
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "angles": [
                    {
                        "name": "knee_flexion",
                        "value": 92.4,
                        "target": 90.0,
                        "percent": 92.4
                    },
                    {
                        "name": "torso_inclination",
                        "value": 44.2,
                        "target": 45.0,
                        "percent": 44.2
                    }
                ],
                "landmarks": [
                    {"x": 0.3, "y": 0.2},
                    {"x": 0.5, "y": 0.45},
                    {"x": 0.8, "y": 0.48}
                ],
                "lines": [
                    {
                        "start": {"x": 0.3, "y": 0.2},
                        "end": {"x": 0.5, "y": 0.45},
                        "label": "shoulder_hip"
                    }
                ],
                "recommendations": [
                    "Distribuye el peso hacia los talones para proteger la articulación"
                ],
                "precision": 98.2,
                "latency_ms": 140
            }
        }