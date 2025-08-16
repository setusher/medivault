# ml-service/service/main.py
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import io
import os
import numpy as np

# Keras/TensorFlow
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
from tensorflow.keras.models import load_model  # type: ignore

app = FastAPI(title="InVisionDX API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

# ---------- CONFIG ----------
# Adjust if your models live in a different folder
MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))

# Default labels assumed for binary classifiers (sigmoid output)
BIN_LABELS = ["negative", "positive"]

# If any model is multi-class, specify labels here by model key (in order of model's output)
EXPLICIT_LABELS = {
    # Example if you ever have multi-class:
    # "alzheimer": ["Non-AD", "Mild", "Moderate", "Severe"],
}

# Target input size for all models (change per model if needed)
DEFAULT_SIZE = (224, 224)

MODELS_CFG = {
    "covid": {
        "file": "COVID_Detect.keras",
        "size": DEFAULT_SIZE,
        "labels": BIN_LABELS,
    },
    "alzheimer": {
        "file": "alzheimer_detect.keras",
        "size": DEFAULT_SIZE,
        "labels": EXPLICIT_LABELS.get("alzheimer", BIN_LABELS),
    },
    "lung": {
        "file": "best_model_lung_cancer.keras",
        "size": DEFAULT_SIZE,
        "labels": BIN_LABELS,
    },
    "pneumonia": {
        "file": "pneumonia_predict.keras",
        "size": DEFAULT_SIZE,
        "labels": BIN_LABELS,
    },
    "tb": {
        "file": "tb_model_final.keras",
        "size": DEFAULT_SIZE,
        "labels": BIN_LABELS,
    },
}

# ---------- LOAD MODELS ONCE ----------
LOADED = {}

def _load_all():
    for key, cfg in MODELS_CFG.items():
        path = os.path.join(MODELS_DIR, cfg["file"])
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model file not found for '{key}': {path}")
        LOADED[key] = load_model(path)  # compiles w/ saved config
        # You can call LOADED[key].summary() here if you need
_load_all()


# ---------- UTILITIES ----------
def _pil_from_upload(upload: UploadFile) -> Image.Image:
    if upload.content_type not in {"image/jpeg", "image/png"}:
        raise HTTPException(400, detail="Only JPEG/PNG images supported")
    try:
        img = Image.open(io.BytesIO(upload.file.read())).convert("RGB")
        return img
    except Exception:
        raise HTTPException(400, detail="Invalid image data")

def _preprocess(img: Image.Image, size) -> np.ndarray:
    """Resize → scale [0,1] → add batch dim; returns np.float32 (1,H,W,3)."""
    img = img.resize(size)
    arr = np.asarray(img, dtype=np.float32) / 255.0
    if arr.ndim == 2:
        arr = np.stack([arr]*3, axis=-1)
    arr = np.expand_dims(arr, axis=0)
    return arr

def _postprocess(pred: np.ndarray, labels) -> dict:
    """
    Turn raw model output into {label: prob} dict.
    Handles both sigmoid (shape (1,1)) and softmax (shape (1,C)).
    """
    pred = np.asarray(pred)
    if pred.ndim == 2 and pred.shape[1] == 1:
        # Sigmoid binary: p(positive)
        p_pos = float(pred[0, 0])
        probs = [1.0 - p_pos, p_pos]
    elif pred.ndim == 2:
        # Softmax or multi-logits already (1, C)
        logits = pred[0]
        # If not already normalized, softmax for safety
        exps = np.exp(logits - np.max(logits))
        probs = (exps / np.sum(exps)).astype(float).tolist()
    else:
        # Fallback
        probs = pred.flatten().astype(float).tolist()

    # Align to labels length. If mismatch, truncate/pad minimally.
    L = len(labels)
    if len(probs) != L:
        if len(probs) > L:
            probs = probs[:L]
        else:
            probs = probs + [0.0] * (L - len(probs))

    return {labels[i]: float(probs[i]) for i in range(L)}

def _predict_single(model_key: str, img: Image.Image) -> dict:
    if model_key not in LOADED:
        raise HTTPException(400, detail=f"Unknown model '{model_key}'")
    model = LOADED[model_key]
    cfg = MODELS_CFG[model_key]
    x = _preprocess(img, cfg["size"])
    raw = model.predict(x, verbose=0)
    probs = _postprocess(raw, cfg["labels"])
    top = max(probs, key=probs.get)
    return {
        "model": model_key,
        "top_label": top,
        "confidence": float(probs[top]),
        "probs": probs,
    }


# ---------- ROUTES ----------
@app.get("/health")
def health():
    return {"ok": True, "models": list(MODELS_CFG.keys())}

@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    model: str | None = Form(default=None),  # optional: covid|alzheimer|lung|pneumonia|tb
):
    """
    - If `model` provided: runs that model only.
    - Else: runs all models and returns a dict keyed by model name.
    """
    img = _pil_from_upload(file)

    if model:
        key = model.strip().lower()
        if key not in MODELS_CFG:
            raise HTTPException(400, detail=f"model must be one of {list(MODELS_CFG.keys())}")
        out = _predict_single(key, img)
        return JSONResponse(out)

    # Run all
    results = {}
    for key in MODELS_CFG.keys():
        results[key] = _predict_single(key, img)
    return JSONResponse({"results": results})
