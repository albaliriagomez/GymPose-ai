from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import JSONResponse
from services.posture_service import posture_analyzer
from schemas.posture import PostureAnalysisResponse

router = APIRouter(prefix="/posture", tags=["posture"])

@router.post("/analyze", response_model=PostureAnalysisResponse)
async def analyze_posture(file: UploadFile = File(...)):
    """
    Endpoint para analizar la postura en una imagen.
    
    Acepta: JPG, PNG
    Retorna: Análisis completo con ángulos, landmarks y recomendaciones
    """
    
    # Validar tipo de archivo
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato no soportado. Usa JPG o PNG."
        )
    
    # Leer bytes de la imagen
    image_bytes = await file.read()
    
    # Validar tamaño (máximo 10MB)
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="La imagen excede el tamaño máximo de 10MB."
        )
    
    # Analizar imagen
    try:
        result = posture_analyzer.analyze_image(image_bytes)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar la imagen: {str(e)}"
        )