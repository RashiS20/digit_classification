from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
import base64
from PIL import Image
import io

app = Flask(__name__)
CORS(app)

# Load model
model = tf.keras.models.load_model("mnist_model.h5")

def preprocess_image(image_data):
    image = Image.open(io.BytesIO(image_data)).convert('L')
    image = image.resize((28, 28))
    image = np.array(image) / 255.0
    image = image.reshape(1, 28, 28, 1)
    return image

@app.route("/")
def home():
    return "API is running"

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json["image"]
    image_data = base64.b64decode(data.split(",")[1])

    processed = preprocess_image(image_data)
    prediction = model.predict(processed)

    return jsonify({
        "prediction": int(np.argmax(prediction))
    })

if __name__ == "__main__":
    app.run(debug=True)