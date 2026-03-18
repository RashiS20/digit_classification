import React, { useRef, useState, useEffect } from "react";

const Canvas = () => {
  const canvasRef = useRef(null);//import axios from "axios";
  const [drawing, setDrawing] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:8002";

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 280, 280);
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left,
      y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top,
    };
  };

  const start = (e) => {
    if (e?.preventDefault) e.preventDefault();
    setDrawing(true);
  };
  const stop = (e) => {
    if (e?.preventDefault) e.preventDefault();
    setDrawing(false);
  };

  const draw = (e) => {
    if (!drawing) return;
    if (e?.preventDefault) e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 280, 280);
    setPrediction(null);
    setConfidence(null);
    setPreviewUrl(null);
    setError(null);
    setIsPredicting(false);
  };

  const buildMnistLike28x28 = (sourceCanvas) => {
    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;
    const srcCtx = sourceCanvas.getContext("2d");
    const src = srcCtx.getImageData(0, 0, srcW, srcH);

    // 1) Find bounding box of non-black pixels
    let minX = srcW,
      minY = srcH,
      maxX = -1,
      maxY = -1;
    const threshold = 10; // treat anything >10 as "ink"
    for (let y = 0; y < srcH; y++) {
      for (let x = 0; x < srcW; x++) {
        const idx = (y * srcW + x) * 4;
        const v = src.data[idx]; // red channel is enough
        if (v > threshold) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    // If nothing drawn, return empty 28x28
    if (maxX < 0 || maxY < 0) {
      const empty = Array.from({ length: 28 }, () => Array.from({ length: 28 }, () => 0));
      return { matrix: empty, url: null };
    }

    const pad = 20; // extra pixels around bbox (in source resolution)
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(srcW - 1, maxX + pad);
    maxY = Math.min(srcH - 1, maxY + pad);

    const boxW = maxX - minX + 1;
    const boxH = maxY - minY + 1;

    // 2) Crop bbox into a canvas
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = boxW;
    cropCanvas.height = boxH;
    const cropCtx = cropCanvas.getContext("2d");
    cropCtx.fillStyle = "black";
    cropCtx.fillRect(0, 0, boxW, boxH);
    cropCtx.drawImage(sourceCanvas, minX, minY, boxW, boxH, 0, 0, boxW, boxH);

    // 3) Resize to fit in 20x20 (MNIST-style), preserving aspect ratio
    const targetInner = 20;
    const scale = targetInner / Math.max(boxW, boxH);
    const scaledW = Math.max(1, Math.round(boxW * scale));
    const scaledH = Math.max(1, Math.round(boxH * scale));

    const scaledCanvas = document.createElement("canvas");
    scaledCanvas.width = scaledW;
    scaledCanvas.height = scaledH;
    const scaledCtx = scaledCanvas.getContext("2d");
    scaledCtx.fillStyle = "black";
    scaledCtx.fillRect(0, 0, scaledW, scaledH);
    scaledCtx.drawImage(cropCanvas, 0, 0, scaledW, scaledH);

    // 4) Paste into 28x28 and center by mass
    const tmp28 = document.createElement("canvas");
    tmp28.width = 28;
    tmp28.height = 28;
    const tmpCtx = tmp28.getContext("2d");
    tmpCtx.fillStyle = "black";
    tmpCtx.fillRect(0, 0, 28, 28);
    const x0 = Math.floor((28 - scaledW) / 2);
    const y0 = Math.floor((28 - scaledH) / 2);
    tmpCtx.drawImage(scaledCanvas, x0, y0);

    const img28 = tmpCtx.getImageData(0, 0, 28, 28);

    let mass = 0;
    let sumX = 0;
    let sumY = 0;
    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 28; x++) {
        const idx = (y * 28 + x) * 4;
        const v = img28.data[idx];
        mass += v;
        sumX += x * v;
        sumY += y * v;
      }
    }

    const comX = mass ? sumX / mass : 14;
    const comY = mass ? sumY / mass : 14;
    const shiftX = Math.round(14 - comX);
    const shiftY = Math.round(14 - comY);

    const final28 = document.createElement("canvas");
    final28.width = 28;
    final28.height = 28;
    const finalCtx = final28.getContext("2d");
    finalCtx.fillStyle = "black";
    finalCtx.fillRect(0, 0, 28, 28);
    finalCtx.drawImage(tmp28, shiftX, shiftY);

    const finalData = finalCtx.getImageData(0, 0, 28, 28);

    // 5) Build 28x28 matrix (0..255)
    const matrix = [];
    for (let r = 0; r < 28; r++) {
      const row = [];
      for (let c = 0; c < 28; c++) {
        const idx = (r * 28 + c) * 4;
        row.push(finalData.data[idx]);
      }
      matrix.push(row);
    }

    return { matrix, url: final28.toDataURL("image/png") };
  };

  const predict = async () => {
    const canvas = canvasRef.current;
    setIsPredicting(true);
    setError(null);
    const { matrix, url } = buildMnistLike28x28(canvas);
    const flat = matrix.flat(); // 784 values

    setPreviewUrl(url);

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flat),
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      setPrediction(json.digit);
      setConfidence(json.confidence ?? null);
    } catch (err) {
      console.error("Prediction error:", err);
      setPrediction(null);
      setConfidence(null);
      setError(
        `Prediction failed. Make sure backend is running on ${API_BASE}. ` +
          `Error: ${err?.message || String(err)}`
      );
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>✍️ Draw a Digit</h2>

        <div style={styles.mainRow}>
          <canvas
            ref={canvasRef}
            width={280}
            height={280}
            style={styles.canvas}
            onMouseDown={start}
            onMouseUp={stop}
            onMouseMove={draw}
            onTouchStart={start}
            onTouchEnd={stop}
            onTouchMove={draw}
          />

          <div style={styles.sidePanel}>
            <div style={styles.resultBox}>
              <p style={styles.resultText}>Prediction</p>
              <h1 style={styles.digit}>
                {isPredicting ? "…" : prediction ?? "—"}
              </h1>
              <p style={styles.confidenceText}>
                Confidence: {typeof confidence === "number" ? confidence.toFixed(3) : "—"}
              </p>
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}

            {previewUrl && (
              <div style={styles.previewBox}>
                <p style={styles.matrixTitle}>Processed 28×28</p>
                <img
                  src={previewUrl}
                  alt="28x28 preview"
                  width={112}
                  height={112}
                  style={styles.previewImg}
                />
              </div>
            )}
          </div>
        </div>

        <div style={styles.buttonContainer}>
          <button style={styles.clearBtn} onClick={clearCanvas}>
            Clear
          </button>

          <button style={styles.predictBtn} onClick={predict}>
            Predict
          </button>
        </div>
      </div>
    </div>
  );
};

export default Canvas;

const styles = {
  page: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #1e293b, #0f172a)",
    color: "white",
  },
  card: {
    background: "#111827",
    padding: "30px",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    textAlign: "center",
  },
  title: {
    marginBottom: "15px",
    fontWeight: "500",
  },
  mainRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: "18px",
    flexWrap: "wrap",
  },
  sidePanel: {
    width: 280,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  canvas: {
    border: "3px solid #374151",
    borderRadius: "12px",
    background: "black",
    cursor: "crosshair",
  },
  buttonContainer: {
    marginTop: "20px",
    display: "flex",
    justifyContent: "center",
    gap: "15px",
  },
  clearBtn: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    background: "#ef4444",
    color: "white",
    cursor: "pointer",
  },
  predictBtn: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    background: "#22c55e",
    color: "white",
    cursor: "pointer",
  },
  resultBox: {
    padding: "15px",
    borderRadius: "10px",
    background: "#1f2937",
    textAlign: "center",
  },
  matrixBox: {
    padding: "12px",
    borderRadius: "10px",
    background: "#0b1220",
    border: "1px solid #243041",
    textAlign: "left",
    maxWidth: 280,
  },
  matrixTitle: {
    margin: "0 0 8px 0",
    fontSize: "12px",
    color: "#9ca3af",
  },
  matrixPre: {
    margin: 0,
    fontSize: "10px",
    lineHeight: 1.2,
    color: "#e5e7eb",
    maxHeight: 180,
    overflow: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  resultText: {
    margin: 0,
    fontSize: "14px",
    color: "#9ca3af",
  },
  confidenceText: {
    margin: "8px 0 0 0",
    fontSize: "12px",
    color: "#cbd5e1",
  },
  digit: {
    margin: 0,
    fontSize: "40px",
    fontWeight: "bold",
    color: "#22c55e",
  },
  previewBox: {
    padding: "12px",
    borderRadius: "10px",
    background: "#0b1220",
    border: "1px solid #243041",
    textAlign: "center",
  },
  previewImg: {
    imageRendering: "pixelated",
    borderRadius: "8px",
    border: "1px solid #243041",
    background: "black",
  },
  errorBox: {
    padding: "10px 12px",
    borderRadius: "10px",
    background: "#2a0f16",
    border: "1px solid #7f1d1d",
    color: "#fecaca",
    fontSize: "12px",
    lineHeight: 1.3,
    textAlign: "left",
  },
};