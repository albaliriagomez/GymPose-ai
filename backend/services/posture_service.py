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

# ─────────────────────────────────────────────
# Umbrales para validar que es una postura real
# ─────────────────────────────────────────────
MIN_VISIBILITY_THRESHOLD = 0.55   # Cada landmark clave debe ser visible al menos 55%
MIN_LANDMARKS_VISIBLE = 8         # Mínimo de landmarks clave visibles
MIN_AVG_VISIBILITY = 0.60         # Visibilidad promedio mínima del cuerpo
EXERCISE_BODY_COVERAGE = 0.15     # El cuerpo debe ocupar al menos 15% del frame

# Landmarks críticos para considerar que es una postura de ejercicio
# (hombros, caderas, rodillas, tobillos — el "esqueleto base")
CRITICAL_LANDMARKS = [11, 12, 23, 24, 25, 26, 27, 28]

# Clasificador de tipos de ejercicio por ángulos
EXERCISE_PROFILES = {
    "Sentadilla": {
        "knee_range": (60, 110),
        "torso_range": (20, 60),
    },
    "De pie / Parado": {
        "knee_range": (155, 185),
        "torso_range": (0, 20),
    },
    "Plancha / Core": {
        "knee_range": (140, 185),
        "torso_range": (0, 25),
    },
    "Peso Muerto": {
        "knee_range": (130, 175),
        "torso_range": (30, 80),
    },
    "Lunges / Zancada": {
        "knee_range": (60, 110),
        "torso_range": (5, 30),
    },
    "Ejercicio en suelo": {
        "knee_range": (30, 120),
        "torso_range": (60, 90),
    },
}


class PostureAnalyzer:
    """Servicio para análisis de postura usando MediaPipe Pose"""

    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=True,
            model_complexity=2,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

    # ─────────────────────────────────────────
    # Utilidades geométricas
    # ─────────────────────────────────────────

    def calculate_angle(self, a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
        """Ángulo en grados formado en el punto b por los segmentos ba y bc."""
        ba = a - b
        bc = c - b
        cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-9)
        return float(np.degrees(np.arccos(np.clip(cosine, -1.0, 1.0))))

    # ─────────────────────────────────────────
    # Validación: ¿hay una persona haciendo ejercicio?
    # ─────────────────────────────────────────

    def _validate_exercise_pose(self, landmarks) -> Tuple[bool, str]:
        """
        Verifica que:
        1. Hay suficientes landmarks del cuerpo visibles.
        2. La visibilidad promedio supera el umbral.
        3. Los landmarks críticos (hombros, caderas, rodillas) están presentes.

        Returns:
            (is_valid: bool, reason: str)
        """
        all_lm = landmarks

        # Visibilidad de landmarks críticos
        critical_visibilities = [all_lm[i].visibility for i in CRITICAL_LANDMARKS]
        visible_critical = sum(1 for v in critical_visibilities if v >= MIN_VISIBILITY_THRESHOLD)
        avg_critical = float(np.mean(critical_visibilities))

        if visible_critical < MIN_LANDMARKS_VISIBLE:
            return False, (
                f"Solo se detectaron {visible_critical}/{MIN_LANDMARKS_VISIBLE} "
                "puntos clave del cuerpo. Asegúrate de que todo el cuerpo sea visible."
            )

        if avg_critical < MIN_AVG_VISIBILITY:
            return False, (
                "La imagen no tiene suficiente claridad o el cuerpo está muy ocluido "
                "para un análisis de postura."
            )

        # Verificar que hay movimiento de cuerpo completo (no solo cabeza/manos)
        hip_l = all_lm[23]
        hip_r = all_lm[24]
        knee_l = all_lm[25]
        knee_r = all_lm[26]

        lower_body_visible = all(
            lm.visibility >= MIN_VISIBILITY_THRESHOLD
            for lm in [hip_l, hip_r, knee_l, knee_r]
        )

        if not lower_body_visible:
            return False, (
                "No se detectó el tren inferior del cuerpo. "
                "Para analizar postura de ejercicio necesitamos ver caderas y rodillas."
            )

        return True, "OK"

    # ─────────────────────────────────────────
    # Clasificador de ejercicio
    # ─────────────────────────────────────────

    def _classify_exercise(self, knee_flexion: float, torso_angle: float) -> str:
        for name, profile in EXERCISE_PROFILES.items():
            k_min, k_max = profile["knee_range"]
            t_min, t_max = profile["torso_range"]
            if k_min <= knee_flexion <= k_max and t_min <= torso_angle <= t_max:
                return name
        return "Postura detectada"

    # ─────────────────────────────────────────
    # Generador de recomendaciones
    # ─────────────────────────────────────────

    def _generate_recommendations(
        self, knee_flexion: float, torso_angle: float, exercise: str
    ) -> List[str]:
        recs = []

        # Rodillas
        if knee_flexion > 100:
            recs.append(
                "⚠️ Rodillas muy flexionadas. Controla el descenso y "
                "distribuye el peso hacia los talones."
            )
        elif knee_flexion > 95:
            recs.append(
                "Leve adelantamiento de rodillas detectado. "
                "Distribuye el peso hacia los talones para proteger la articulación."
            )
        elif knee_flexion < 80 and exercise in ("Sentadilla", "Lunges / Zancada"):
            recs.append(
                "Tu flexión de rodilla es menor a la ideal para este ejercicio. "
                "Intenta descender un poco más."
            )
        else:
            recs.append("✅ Alineación de rodillas correcta. ¡Buen trabajo!")

        # Torso
        if torso_angle < 30 and exercise == "Sentadilla":
            recs.append(
                "El torso está muy inclinado hacia adelante. "
                "Mantén el pecho erguido y la mirada al frente."
            )
        elif torso_angle > 70 and exercise in ("Sentadilla", "De pie / Parado"):
            recs.append(
                "Detectamos hiperlordosis lumbar. "
                "Activa el core y mantén la columna neutral."
            )

        # Específico por ejercicio
        if exercise == "Plancha / Core":
            recs.append(
                "Para plancha: asegúrate de que caderas y hombros estén "
                "alineados horizontalmente."
            )
        elif exercise == "Peso Muerto":
            recs.append(
                "En peso muerto: mantén la barra cerca del cuerpo y "
                "empuja con los talones al subir."
            )

        return recs

    # ─────────────────────────────────────────
    # Análisis principal
    # ─────────────────────────────────────────

    def analyze_image(self, image_bytes: bytes) -> PostureAnalysisResponse:
        start_time = time.time()

        # Decodificar imagen
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            return PostureAnalysisResponse(
                success=False,
                angles=[],
                landmarks=[],
                lines=[],
                recommendations=["No se pudo leer la imagen. Verifica que sea un JPG o PNG válido."],
                precision=0.0,
                latency_ms=int((time.time() - start_time) * 1000),
                exercise_type=None,
                validation_message="Imagen inválida"
            )

        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.pose.process(image_rgb)

        # ── Sin pose detectada
        if not results.pose_landmarks:
            return PostureAnalysisResponse(
                success=False,
                angles=[],
                landmarks=[],
                lines=[],
                recommendations=[
                    "🚫 No se detectó ninguna persona en la imagen.",
                    "Sube una foto donde el cuerpo completo sea claramente visible, "
                    "con buena iluminación y sin objetos que lo tapen."
                ],
                precision=0.0,
                latency_ms=int((time.time() - start_time) * 1000),
                exercise_type=None,
                validation_message="No se detectó persona"
            )

        landmarks = results.pose_landmarks.landmark

        # ── Validar que es ejercicio real
        is_valid, reason = self._validate_exercise_pose(landmarks)
        if not is_valid:
            return PostureAnalysisResponse(
                success=False,
                angles=[],
                landmarks=[],
                lines=[],
                recommendations=[
                    f"🚫 {reason}",
                    "Tip: Sube una imagen donde el cuerpo completo sea visible — "
                    "sentadilla, plancha, peso muerto, etc."
                ],
                precision=0.0,
                latency_ms=int((time.time() - start_time) * 1000),
                exercise_type=None,
                validation_message=reason
            )

        # ── Extraer puntos clave
        def lm(idx):
            return np.array([landmarks[idx].x, landmarks[idx].y])

        left_shoulder  = lm(11)
        right_shoulder = lm(12)
        left_hip       = lm(23)
        right_hip      = lm(24)
        left_knee      = lm(25)
        right_knee     = lm(26)
        left_ankle     = lm(27)
        right_ankle    = lm(28)

        # ── Calcular ángulos
        knee_angle_left  = self.calculate_angle(left_hip, left_knee, left_ankle)
        knee_angle_right = self.calculate_angle(right_hip, right_knee, right_ankle)
        knee_flexion     = (knee_angle_left + knee_angle_right) / 2

        vertical_ref = np.array([left_shoulder[0], left_shoulder[1] - 0.1])
        torso_angle  = self.calculate_angle(vertical_ref, left_shoulder, left_hip)

        # ── Clasificar ejercicio
        exercise_type = self._classify_exercise(knee_flexion, torso_angle)

        # ── Ángulos para el frontend
        angles_data = [
            AngleData(
                name="Flexión de Rodilla",
                value=round(knee_flexion, 1),
                target=90.0,
                percent=min(100.0, round((knee_flexion / 90.0) * 100, 1))
            ),
            AngleData(
                name="Inclinación Torso",
                value=round(torso_angle, 1),
                target=45.0,
                percent=min(100.0, round((torso_angle / 45.0) * 100, 1))
            ),
        ]

        # ── Landmarks para visualización
        landmark_coords = [
            Coordinate(x=left_shoulder[0],  y=left_shoulder[1]),
            Coordinate(x=left_hip[0],       y=left_hip[1]),
            Coordinate(x=left_knee[0],      y=left_knee[1]),
            Coordinate(x=right_shoulder[0], y=right_shoulder[1]),
            Coordinate(x=right_hip[0],      y=right_hip[1]),
            Coordinate(x=right_knee[0],     y=right_knee[1]),
        ]

        # ── Líneas a dibujar
        lines_data = [
            LandmarkLines(start=Coordinate(x=left_shoulder[0], y=left_shoulder[1]),
                          end=Coordinate(x=left_hip[0], y=left_hip[1]),
                          label="shoulder_hip_left"),
            LandmarkLines(start=Coordinate(x=left_hip[0], y=left_hip[1]),
                          end=Coordinate(x=left_knee[0], y=left_knee[1]),
                          label="hip_knee_left"),
            LandmarkLines(start=Coordinate(x=left_knee[0], y=left_knee[1]),
                          end=Coordinate(x=left_ankle[0], y=left_ankle[1]),
                          label="knee_ankle_left"),
            LandmarkLines(start=Coordinate(x=right_shoulder[0], y=right_shoulder[1]),
                          end=Coordinate(x=right_hip[0], y=right_hip[1]),
                          label="shoulder_hip_right"),
            LandmarkLines(start=Coordinate(x=right_hip[0], y=right_hip[1]),
                          end=Coordinate(x=right_knee[0], y=right_knee[1]),
                          label="hip_knee_right"),
            LandmarkLines(start=Coordinate(x=right_knee[0], y=right_knee[1]),
                          end=Coordinate(x=right_ankle[0], y=right_ankle[1]),
                          label="knee_ankle_right"),
        ]

        recommendations = self._generate_recommendations(knee_flexion, torso_angle, exercise_type)

        avg_visibility = float(np.mean([landmarks[i].visibility for i in CRITICAL_LANDMARKS]))
        precision = round(avg_visibility * 100, 1)
        latency   = int((time.time() - start_time) * 1000)

        return PostureAnalysisResponse(
            success=True,
            angles=angles_data,
            landmarks=landmark_coords,
            lines=lines_data,
            recommendations=recommendations,
            precision=precision,
            latency_ms=latency,
            exercise_type=exercise_type,
            validation_message="Análisis completado correctamente"
        )


# Instancia global
posture_analyzer = PostureAnalyzer()