# Digit classification on canvas

## Backend (FastAPI)

1. Put your trained model file at `backend/mnist_model.h5` (the API loads `mnist_model.h5`).
2. Install deps:

```bash
cd backend
pip install -r requirements.txt
```

## Use a downloaded Colab model instead

If you already trained a model in Google Colab, save it as **`.h5`** or **`.keras`**, download it, and put it in `backend/`.

### In Colab

```python
# If your model variable is called `model`
model.save("mnist_model.h5")      # or: model.save("mnist_model.keras")
```

Then download `mnist_model.h5` from Colab to your computer.

### In this project

- Copy the file to: `backend/mnist_model.h5` (recommended), then start the backend normally.
- Or keep any filename and set `MODEL_PATH`:

```bash
cd backend
set MODEL_PATH=your_downloaded_model.h5
uvicorn main:app --reload --port 8002
```

3. Run:

```bash
uvicorn main:app --reload --port 8002
```

## Frontend (React)

```bash
cd frontend
npm start
```

## What happens on Predict

- The canvas (280×280) is downscaled to **28×28**
- A **28×28 matrix** (values 0..255) is built and:
  - printed in the browser console (also `console.table`)
  - shown in the UI
- That matrix is sent to `POST /predict` and the predicted digit is displayed

