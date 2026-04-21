import cv2
import numpy as np
import mediapipe as mp
import time
from typing import Tuple, List, Dict
from schemas.posture import (
    PostureAnalysisResponse, 
    AngleData, 
    Coordinate, 
    LandmarkLines
)

class PostureAnalyzer:
    """Servicio para análisis de postura usando MediaPipe"""
    
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=True,
            model_complexity=2,
            min_detection_confidence=0.5
        )
    
    def calculate_angle(self, a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
        """
        Calcula el ángulo entre tres puntos.
        a, b, c son arrays numpy de forma (2,) con coordenadas [x, y]
        """
        ba = a - b
        bc = c - b
        
        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
        angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
        
        return np.degrees(angle)
    
    def analyze_image(self, image_bytes: bytes) -> PostureAnalysisResponse:
        """
        Analiza una imagen y retorna métricas de postura.
        
        Args:
            image_bytes: Bytes de la imagen (JPG/PNG)
            
        Returns:
            PostureAnalysisResponse con todos los datos del análisis
        """
        start_time = time.time()
        
        # Convertir bytes a imagen OpenCV
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Procesar con MediaPipe
        results = self.pose.process(image_rgb)
        
        if not results.pose_landmarks:
            return PostureAnalysisResponse(
                success=False,
                angles=[],
                landmarks=[],
                lines=[],
                recommendations=["No se detectó una persona en la imagen. Asegúrate de estar visible."],
                precision=0.0,
                latency_ms=int((time.time() - start_time) * 1000)
            )
        
        # Extraer landmarks
        landmarks = results.pose_landmarks.landmark
        
        # Obtener puntos clave (normalizados 0-1)
        # Índices MediaPipe: https://google.github.io/mediapipe/solutions/pose.html
        left_shoulder = np.array([landmarks[11].x, landmarks[11].y])
        left_hip = np.array([landmarks[23].x, landmarks[23].y])
        left_knee = np.array([landmarks[25].x, landmarks[25].y])
        left_ankle = np.array([landmarks[27].x, landmarks[27].y])
        
        right_shoulder = np.array([landmarks[12].x, landmarks[12].y])
        right_hip = np.array([landmarks[24].x, landmarks[24].y])
        right_knee = np.array([landmarks[26].x, landmarks[26].y])
        
        # Calcular ángulos
        knee_angle_left = self.calculate_angle(left_hip, left_knee, left_ankle)
        right_ankle = np.array([landmarks[28].x, landmarks[28].y]) 
        knee_angle_right = self.calculate_angle(right_hip, right_knee, right_ankle)
        
        # Promedio de rodillas
        knee_flexion = (knee_angle_left + knee_angle_right) / 2
        
        # Ángulo de inclinación del torso
        # Usamos la vertical como referencia
        vertical_point = np.array([left_shoulder[0], left_shoulder[1] - 0.1])
        torso_angle = self.calculate_angle(vertical_point, left_shoulder, left_hip)
        
        # Crear datos de ángulos
        angles_data = [
            AngleData(
                name="Flexión de Rodilla",
                value=round(knee_flexion, 1),
                target=90.0,
                percent=min(100, round((knee_flexion / 90) * 100, 1))
            ),
            AngleData(
                name="Inclinación Torso",
                value=round(torso_angle, 1),
                target=45.0,
                percent=min(100, round((torso_angle / 45) * 100, 1))
            )
        ]
        
        # Landmarks para visualización
        landmark_coords = [
            Coordinate(x=left_shoulder[0], y=left_shoulder[1]),
            Coordinate(x=left_hip[0], y=left_hip[1]),
            Coordinate(x=left_knee[0], y=left_knee[1]),
            Coordinate(x=right_shoulder[0], y=right_shoulder[1]),
            Coordinate(x=right_hip[0], y=right_hip[1]),
            Coordinate(x=right_knee[0], y=right_knee[1]),
        ]
        
        # Líneas a dibujar
        lines_data = [
            LandmarkLines(
                start=Coordinate(x=left_shoulder[0], y=left_shoulder[1]),
                end=Coordinate(x=left_hip[0], y=left_hip[1]),
                label="shoulder_hip_left"
            ),
            LandmarkLines(
                start=Coordinate(x=left_hip[0], y=left_hip[1]),
                end=Coordinate(x=left_knee[0], y=left_knee[1]),
                label="hip_knee_left"
            ),
            LandmarkLines(
                start=Coordinate(x=right_shoulder[0], y=right_shoulder[1]),
                end=Coordinate(x=right_hip[0], y=right_hip[1]),
                label="shoulder_hip_right"
            ),
            LandmarkLines(
                start=Coordinate(x=right_hip[0], y=right_hip[1]),
                end=Coordinate(x=right_knee[0], y=right_knee[1]),
                label="hip_knee_right"
            ),
        ]
        
        # Generar recomendaciones
        recommendations = []
        if knee_flexion > 95:
            recommendations.append("Detectamos un leve adelantamiento de rodillas. Distribuye el peso hacia los talones para proteger la articulación.")
        elif knee_flexion < 85:
            recommendations.append("Tu flexión de rodilla es menor a la ideal. Desciende un poco más.")
        else:
            recommendations.append("¡Excelente técnica! Mantén esta postura.")
        
        if torso_angle < 40:
            recommendations.append("Tu torso está muy inclinado. Mantén el pecho más erguido.")
        
        # Calcular precisión (basado en visibilidad de landmarks)
        avg_visibility = np.mean([lm.visibility for lm in landmarks])
        precision = round(avg_visibility * 100, 1)
        
        latency = int((time.time() - start_time) * 1000)
        
        return PostureAnalysisResponse(
            success=True,
            angles=angles_data,
            landmarks=landmark_coords,
            lines=lines_data,
            recommendations=recommendations,
            precision=precision,
            latency_ms=latency
        )

# Instancia global
posture_analyzer = PostureAnalyzer()