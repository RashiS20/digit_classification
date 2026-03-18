import os
from typing import List

import numpy as np
import tensorflow as tf
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware


def _load_model() -> tf.keras.Model:
    model_path = os.environ.get("MODEL_PATH", os.path.join(os.path.dirname(__file__), "mnist_model.h5"))
    return tf.keras.models.load_model(model_path)


app = FastAPI(title="MNIST Canvas Digit Classifier")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = _load_model()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict(flat_pixels: List[float]):

    x = np.array(flat_pixels, dtype=np.float32).reshape(1, 28, 28)
    x = x / 255.0

    input_shape = getattr(model, "input_shape", None)
    if isinstance(input_shape, (list, tuple)) and len(input_shape) == 4:
        x = x[..., np.newaxis]

    preds = model.predict(x, verbose=0)
    probs = np.array(preds).reshape(-1)
    digit = int(np.argmax(probs))
    confidence = float(np.max(probs))
    return {"digit": digit, "confidence": confidence}

