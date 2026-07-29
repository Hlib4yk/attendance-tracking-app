"""HTTP API: single-face embedding (enrollment) and multi-face matching vs prototypes (attendance)."""
from __future__ import annotations

import json
import logging
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from insightface.app import FaceAnalysis

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = FastAPI(title="Diploma face service", version="1.0.0")

_face_app: FaceAnalysis | None = None


def get_face_app() -> FaceAnalysis:
    global _face_app
    if _face_app is None:
        log.info("Loading InsightFace buffalo_l (first run may download model weights)...")
        _face_app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        _face_app.prepare(ctx_id=-1, det_size=(640, 640))
    return _face_app


def decode_image(data: bytes) -> np.ndarray:
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image data")
    return img


def _largest_face_first(faces: list) -> list:
    def area(f) -> float:
        b = f.bbox
        return float((b[2] - b[0]) * (b[3] - b[1]))

    return sorted(faces, key=area, reverse=True)


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/v1/embed")
async def embed(image: UploadFile = File(...)) -> dict[str, Any]:
    data = await image.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    img = decode_image(data)
    faces = get_face_app().get(img)
    if not faces:
        raise HTTPException(status_code=400, detail="No face detected")
    ordered = _largest_face_first(faces)
    emb = ordered[0].normed_embedding.astype(np.float64)
    return {"embedding": emb.tolist(), "faces_detected": len(faces)}


@app.post("/v1/match")
async def match(image: UploadFile = File(...), meta: str = Form(...)) -> dict[str, Any]:
    try:
        spec: dict[str, Any] = json.loads(meta)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"meta must be valid JSON: {e}") from e

    prototypes = spec.get("prototypes")
    if not isinstance(prototypes, list) or len(prototypes) == 0:
        raise HTTPException(status_code=400, detail="prototypes must be a non-empty list")
    threshold = float(spec.get("threshold", 0.45))

    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    img = decode_image(raw)
    faces = get_face_app().get(img)
    if not faces:
        raise HTTPException(status_code=400, detail="No face detected in audience photo")

    protos: list[tuple[str, np.ndarray]] = []
    for p in prototypes:
        if not isinstance(p, dict) or "id" not in p or "embedding" not in p:
            continue
        vec = np.asarray(p["embedding"], dtype=np.float64).ravel()
        n = float(np.linalg.norm(vec))
        if n < 1e-8:
            continue
        protos.append((str(p["id"]), vec / n))

    if not protos:
        raise HTTPException(status_code=400, detail="No valid prototype embeddings")

    pairs: list[tuple[float, int, str]] = []
    for fi, face in enumerate(faces):
        e = face.normed_embedding.astype(np.float64).ravel()
        e /= float(np.linalg.norm(e)) + 1e-8
        for sid, pvec in protos:
            s = float(np.dot(e, pvec))
            pairs.append((s, fi, sid))

    pairs.sort(key=lambda x: x[0], reverse=True)
    used_face: set[int] = set()
    used_sid: set[str] = set()
    matches: list[dict[str, Any]] = []
    for s, fi, sid in pairs:
        if s < threshold:
            break
        if fi in used_face or sid in used_sid:
            continue
        used_face.add(fi)
        used_sid.add(sid)
        matches.append({"id": sid, "confidence": round(float(s), 4)})

    return {"matches": matches, "faces_in_image": len(faces), "threshold": threshold}
