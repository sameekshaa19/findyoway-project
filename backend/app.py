import os
import base64
import logging
from io import BytesIO
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import google.generativeai as genai
from dotenv import load_dotenv
import cv2
import numpy as np

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app with CORS for mobile access
app = Flask(__name__)

# Critical: Configure CORS for Expo mobile app access
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"]
    }
})

# Configure Gemini API
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    logger.warning("GOOGLE_API_KEY not set. Vision features will not work.")
else:
    genai.configure(api_key=GOOGLE_API_KEY)

# Initialize Gemini model
try:
    vision_model = genai.GenerativeModel('gemini-1.5-flash')
    text_model = genai.GenerativeModel('gemini-1.5-flash')
except Exception as e:
    logger.error(f"Failed to initialize Gemini: {e}")
    vision_model = None
    text_model = None

# Initialize Supabase client
from supabase import create_client
SUPABASE_URL = os.getenv('EXPO_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('EXPO_PUBLIC_SUPABASE_ANON_KEY')
supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None
if supabase_client:
    logger.info("Supabase connected successfully")
else:
    logger.warning("Supabase not configured")

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "FindYoWay Backend",
        "version": "1.0.0",
        "vision_enabled": vision_model is not None,
        "supabase_connected": supabase_client is not None
    }), 200

# Load MobileNet-SSD model for object detection
PROTOTXT_PATH = "MobileNetSSD_deploy.prototxt"
MODEL_PATH = "MobileNetSSD_deploy.caffemodel"
CLASS_NAMES = ["background", "aeroplane", "bicycle", "bird", "boat",
               "bottle", "bus", "car", "cat", "chair", "cow", "diningtable",
               "dog", "horse", "motorbike", "person", "pottedplant", "sheep",
               "sofa", "train", "tvmonitor"]

DANGEROUS_OBJECTS = ["person", "chair", "diningtable", "bottle", "sofa", "tvmonitor"]

def download_model():
    prototxt_url = "https://raw.githubusercontent.com/chuanqi305/MobileNet-SSD/master/deploy.prototxt"
    model_url = "https://github.com/chuanqi305/MobileNet-SSD/raw/master/mobilenet_iter_73000.caffemodel"
    if not os.path.exists(PROTOTXT_PATH):
        import urllib.request
        print("Downloading MobileNet-SSD prototxt...")
        urllib.request.urlretrieve(prototxt_url, PROTOTXT_PATH)
    if not os.path.exists(MODEL_PATH):
        import urllib.request
        print("Downloading MobileNet-SSD model...")
        urllib.request.urlretrieve(model_url, MODEL_PATH)

download_model()
net = cv2.dnn.readNetFromCaffe(PROTOTXT_PATH, MODEL_PATH)

# ---------------------------------------------------------------------------
# /api/navigate  — navigation queries via Gemini
# /chat          — backward compat alias
# ---------------------------------------------------------------------------
def _chat_logic(message, language="English", context=""):
    if not text_model:
        return f"Navigation assistance for: {message}. (AI model not configured)"
    system_prompt = (
        f"You are a helpful indoor/outdoor navigation assistant. "
        f"Reply in {language}. Be concise — the response will be spoken aloud. "
        f"Context: {context}"
    )
    response = text_model.generate_content(f"{system_prompt}\n\nUser: {message}")
    return response.text

@app.route('/api/navigate', methods=['POST'])
def api_navigate():
    try:
        data = request.json or {}
        message  = data.get('message', '')
        language = data.get('language', 'English')
        context  = data.get('context', '')
        if not message:
            return jsonify({"error": "message is required"}), 400
        reply = _chat_logic(message, language, context)
        return jsonify({"reply": reply}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json or {}
        message = data.get('message', '')
        if not message:
            return jsonify({"error": "message is required"}), 400
        reply = _chat_logic(message)
        return jsonify({"reply": reply}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------------------------
# /api/stt  — speech-to-text
# ---------------------------------------------------------------------------
@app.route('/api/stt', methods=['POST'])
def api_stt():
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "audio file is required"}), 400
        audio_file = request.files['audio']
        language = request.form.get('language', 'English')
        placeholder_transcripts = {
            'English': 'pharmacy',
            'Hindi': 'फार्मेसी',
            'Spanish': 'farmacia',
            'French': 'pharmacie'
        }
        transcript = placeholder_transcripts.get(language, 'pharmacy')
        return jsonify({"transcript": transcript}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------------------------
# /api/vision  — sign reading using EasyOCR
# /read-signs  — backward compat alias
# ---------------------------------------------------------------------------
import easyocr
ocr_reader = easyocr.Reader(['en'], gpu=False)

def _vision_logic(image_bytes, goal="destination", language="English"):
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return "Could not process image"
        results = ocr_reader.readtext(img)
        if not results:
            return "No signs detected, keep walking slowly."
        detected_texts = [r[1] for r in results]
        text = " | ".join(detected_texts)
        common_signs = {
            'exit': 'Exit sign detected ahead',
            'entrance': 'Entrance ahead',
            'stairs': 'Stairs detected ahead, be careful',
            'elevator': 'Elevator nearby',
            'restroom': 'Restroom nearby',
            'pharmacy': 'Pharmacy nearby',
            'caution': 'Caution sign detected',
            'stop': 'Stop sign detected',
        }
        text_lower = text.lower()
        for sign_keyword, guidance in common_signs.items():
            if sign_keyword in text_lower:
                return guidance
        return f"Sign detected: {text}"
    except Exception as e:
        return f"Could not read signs: {str(e)}"

@app.route('/api/vision', methods=['POST'])
def api_vision():
    try:
        data = request.json or {}
        frame_b64 = data.get('frame', '')
        goal      = data.get('goal', 'destination')
        language  = data.get('language', 'English')
        if not frame_b64:
            return jsonify({"error": "frame is required"}), 400
        image_bytes = base64.b64decode(frame_b64)
        guidance = _vision_logic(image_bytes, goal, language)
        return jsonify({"guidance": guidance}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/read-signs', methods=['POST'])
def read_signs():
    try:
        if 'image' not in request.files:
            return jsonify({"error": "image file is required"}), 400
        image_bytes = request.files['image'].read()
        guidance = _vision_logic(image_bytes)
        return jsonify({"reply": guidance}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------------------------
# /api/detect  — object detection using MobileNet-SSD
# ---------------------------------------------------------------------------
def estimate_distance(box_area, frame_area):
    ratio = box_area / frame_area
    if ratio > 0.3:
        return "very close"
    elif ratio > 0.15:
        return "about 1 to 2 meters"
    elif ratio > 0.05:
        return "about 3 to 4 meters"
    else:
        return "far away"

@app.route('/api/detect', methods=['POST'])
def api_detect():
    try:
        data = request.json or {}
        frame_b64 = data.get('frame', '')
        if not frame_b64:
            return jsonify({"error": "frame is required"}), 400
        image_bytes = base64.b64decode(frame_b64)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            return jsonify({"error": "invalid image"}), 400
        (h, w) = image.shape[:2]
        frame_area = h * w
        blob = cv2.dnn.blobFromImage(cv2.resize(image, (300, 300)), 0.007843, (300, 300), 127.5)
        net.setInput(blob)
        detections = net.forward()
        objects = []
        for i in range(detections.shape[2]):
            confidence = detections[0, 0, i, 2]
            if confidence > 0.5:
                idx = int(detections[0, 0, i, 1])
                class_name = CLASS_NAMES[idx]
                box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                (startX, startY, endX, endY) = box.astype("int")
                box_width = endX - startX
                box_height = endY - startY
                box_area = box_width * box_height
                distance = estimate_distance(box_area, frame_area)
                objects.append({
                    "name": class_name,
                    "score": float(confidence),
                    "distance": distance,
                    "isDangerous": class_name in DANGEROUS_OBJECTS,
                    "bbox": [int(startX), int(startY), int(box_width), int(box_height)]
                })
        objects.sort(key=lambda x: (not x["isDangerous"], -x["score"]))
        return jsonify({"objects": objects, "count": len(objects)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------------------------
# /api/venues/search  — search venues by name and city from Supabase
# ---------------------------------------------------------------------------
@app.route('/api/venues/search', methods=['GET'])
def search_venues():
    """Search venues by name and city from Supabase."""
    try:
        name = request.args.get('name', '')
        city = request.args.get('city', '')

        if not name:
            return jsonify({"error": "name is required"}), 400

        if not supabase_client:
            return jsonify({"error": "Database not configured"}), 500

        query = supabase_client.table('venues').select('*')

        if name:
            query = query.ilike('name', f'%{name}%')
        if city:
            query = query.ilike('city', f'%{city}%')

        result = query.execute()

        return jsonify({
            "venues": result.data,
            "count": len(result.data)
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------------------------
# /api/venues/<venue_id>  — get full venue details including floor plan
# ---------------------------------------------------------------------------
@app.route('/api/venues/<venue_id>', methods=['GET'])
def get_venue(venue_id):
    """Get venue details and floor plan by venue ID."""
    try:
        if not supabase_client:
            return jsonify({"error": "Database not configured"}), 500

        result = supabase_client.table('venues').select('*').eq('id', venue_id).execute()

        if not result.data:
            return jsonify({"error": "Venue not found"}), 404

        return jsonify({"venue": result.data[0]}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    logger.info(f"Starting FindYoWay backend on port {port}")
    logger.info(f"Debug mode: {debug}")
    logger.info(f"Vision enabled: {vision_model is not None}")
    app.run(host='0.0.0.0', port=port, debug=debug, threaded=True)