from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import cv2
import numpy as np
import base64

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Backend is running"}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    if not file.content_type:
        raise HTTPException(status_code=400, detail="Không xác định được loại file")

    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Hiện tại demo chỉ hỗ trợ file ảnh (.png, .jpg, .jpeg)"
        )

    content = await file.read()

    try:
        pil_image = Image.open(io.BytesIO(content)).convert("RGB")
        image_np = np.array(pil_image)
        image_bgr = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
    except Exception:
        raise HTTPException(status_code=400, detail="Không đọc được file ảnh")

    height, width = image_bgr.shape[:2]

    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

    # Nhị phân đảo: line đen -> trắng
    _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

    # Kernel dài để giữ line ngang/dọc, loại bớt chữ và nét cong nhỏ
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))

    horizontal_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel)
    vertical_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, vertical_kernel)

    overlay = image_bgr.copy()
    detected_lines = 0
    total_line_length_px = 0.0

    # ---- xử lý line ngang ----
    contours_h, _ = cv2.findContours(horizontal_lines, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for cnt in contours_h:
        x, y, w, h = cv2.boundingRect(cnt)

        # chỉ giữ line ngang đủ dài, bỏ line text nhỏ
        if w >= 120 and h <= 12 and y < height - 80:
            detected_lines += 1
            total_line_length_px += w
            cv2.rectangle(overlay, (x, y), (x + w, y + h), (255, 0, 0), 2)

    # ---- xử lý line dọc ----
    contours_v, _ = cv2.findContours(vertical_lines, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for cnt in contours_v:
        x, y, w, h = cv2.boundingRect(cnt)

        # chỉ giữ line dọc đủ dài
        if w >= 120 and h <= 12 and y < height - 80:
            detected_lines += 1
            total_line_length_px += h
            cv2.rectangle(overlay, (x, y), (x + w, y + h), (255, 0, 0), 2)

    # hardcode scale demo từ file test:
    # "Overall width: 14.0 m"
    real_width_m = 14.0
    meter_per_pixel = real_width_m / width
    walls_length = round(total_line_length_px * meter_per_pixel, 2)

    # rule demo
    columns = 8
    cement_ton = round(walls_length * 0.03, 2)
    steel_ton = round(walls_length * 0.009, 2)

    _, buffer = cv2.imencode(".png", overlay)
    overlay_base64 = base64.b64encode(buffer).decode("utf-8")

    return {
        "filename": file.filename,
        "image_width": width,
        "image_height": height,
        "detected_lines": detected_lines,
        "meter_per_pixel": round(meter_per_pixel, 5),
        "walls_length": walls_length,
        "columns": columns,
        "cement_ton": cement_ton,
        "steel_ton": steel_ton,
        "overlay_image": overlay_base64
    }