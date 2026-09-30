"""HTTP endpoint for flower image classification."""
from io import BytesIO

from fastapi import APIRouter, HTTPException, Request, UploadFile
from PIL import Image, UnidentifiedImageError

router = APIRouter(prefix="/api/classifier", tags=["classifier"])
MAX_IMAGE_BYTES = 10 * 1024 * 1024


@router.post("/predict")
async def predict(request: Request, file: UploadFile):
    classifier = request.app.state.models.get("classifier")
    if classifier is None:
        raise HTTPException(503, "Mô hình phân loại hoa chưa được nạp. Hãy huấn luyện model và bật classifier trong ENABLED_MODELS.")
    contents = await file.read(MAX_IMAGE_BYTES + 1)
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Ảnh vượt quá giới hạn 10 MB.")
    try:
        with Image.open(BytesIO(contents)) as image:
            image.load()
            result = classifier.predict(image)
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(400, "Tệp tải lên không phải ảnh hợp lệ.") from None
    return result