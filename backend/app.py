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
        "origins": "*",  # Allow all origins for development
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

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for mobile app connectivity testing."""
    return jsonify({
        "status": "healthy",
        "service": "FindYoWay Backend",
        "version": "1.0.0",
        "vision_enabled": vision_model is not None
    }), 200

# Load MobileNet-SSD model for object detection
# Download model files if they don't exist
PROTOTXT_PATH = "MobileNetSSD_deploy.prototxt"
MODEL_PATH = "MobileNetSSD_deploy.caffemodel"
CLASS_NAMES = ["background", "aeroplane", "bicycle", "bird", "boat",
               "bottle", "bus", "car", "cat", "chair", "cow", "diningtable",
               "dog", "horse", "motorbike", "person", "pottedplant", "sheep",
               "sofa", "train", "tvmonitor"]

# Dangerous objects for visually impaired navigation
DANGEROUS_OBJECTS = ["person", "chair", "diningtable", "bottle", "sofa", "tvmonitor"]

def download_model():
    """Download MobileNet-SSD model files if not present."""
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

# Download model on startup
download_model()

# Load the model
net = cv2.dnn.readNetFromCaffe(PROTOTXT_PATH, MODEL_PATH)

# ---------------------------------------------------------------------------
# /api/navigate  — spoken navigation queries (used by geminiService.askGemini)
# /chat          — alias kept for backward-compat
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
    """Primary navigation chat endpoint (called by geminiService.js)."""
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
    """Backward-compatible alias for /api/navigate."""
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
# /api/vision  — camera frame sign reading using EasyOCR
# /read-signs  — alias kept for backward-compat
# ---------------------------------------------------------------------------
_ocr_reader = None

def _get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        import easyocr
        _ocr_reader = easyocr.Reader(['en'], gpu=False)
    return _ocr_reader

def _vision_logic(image_bytes, goal="destination", language="English"):
    """Extract text from image using EasyOCR."""
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return "Could not process image"
        
        # Run OCR
        results = _get_ocr_reader().readtext(img)
        
        if not results:
            return "No signs detected, keep walking slowly."
        
        # Extract all detected text
        detected_texts = [r[1] for r in results]
        text = " | ".join(detected_texts)
        
        # Generate guidance based on detected signs
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
    """Primary vision endpoint — accepts base64 JSON (called by geminiService.js)."""
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
    """Backward-compatible alias — accepts multipart file upload."""
    try:
        if 'image' not in request.files:
            return jsonify({"error": "image file is required"}), 400
        image_bytes = request.files['image'].read()
        guidance = _vision_logic(image_bytes)
        return jsonify({"reply": guidance}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------------------------
# /api/detect  — Real-time object detection endpoint
# ---------------------------------------------------------------------------
def estimate_distance(box_area, frame_area):
    """Estimate distance based on bounding box size."""
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
    """Object detection endpoint — accepts base64 image, returns detected objects."""
    try:
        data = request.json or {}
        frame_b64 = data.get('frame', '')
        
        if not frame_b64:
            return jsonify({"error": "frame is required"}), 400
        
        # Decode base64 image
        image_bytes = base64.b64decode(frame_b64)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({"error": "invalid image"}), 400
        
        (h, w) = image.shape[:2]
        frame_area = h * w
        
        # Prepare image for MobileNet-SSD
        blob = cv2.dnn.blobFromImage(cv2.resize(image, (300, 300)), 0.007843, (300, 300), 127.5)
        net.setInput(blob)
        detections = net.forward()
        
        objects = []
        for i in range(detections.shape[2]):
            confidence = detections[0, 0, i, 2]
            
            # Filter by confidence threshold
            if confidence > 0.5:
                idx = int(detections[0, 0, i, 1])
                class_name = CLASS_NAMES[idx]
                
                box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                (startX, startY, endX, endY) = box.astype("int")
                
                # Calculate box area for distance estimation
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
        
        # Sort by danger and confidence
        objects.sort(key=lambda x: (not x["isDangerous"], -x["score"]))
        
        return jsonify({
            "objects": objects,
            "count": len(objects)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------------------------
# /api/venues  — Floor plan data for mobile app
# ---------------------------------------------------------------------------
import urllib.request
import json as json_lib

_SUPABASE_URL = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL', '')
_SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY', '')

@app.route('/api/venues', methods=['GET'])
def api_list_venues():
    """List all venues with published floor plans."""
    if not _SUPABASE_URL or not _SUPABASE_ANON_KEY:
        return jsonify({"error": "Supabase not configured"}), 503
    try:
        rest_url = f"{_SUPABASE_URL}/rest/v1/venues?order=created_at.desc"
        req = urllib.request.Request(rest_url, headers={
            "apikey": _SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {_SUPABASE_ANON_KEY}",
        })
        with urllib.request.urlopen(req) as resp:
            data = json_lib.loads(resp.read().decode())
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/venues/<venue_id>/floorplan', methods=['GET'])
def api_get_floorplan(venue_id):
    """Get the latest published floor plan for a venue."""
    if not _SUPABASE_URL or not _SUPABASE_ANON_KEY:
        return jsonify({"error": "Supabase not configured"}), 503
    try:
        rest_url = (
            f"{_SUPABASE_URL}/rest/v1/floor_plans"
            f"?venue_id=eq.{venue_id}&is_published=eq.true"
            f"&order=version.desc&limit=1"
        )
        req = urllib.request.Request(rest_url, headers={
            "apikey": _SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {_SUPABASE_ANON_KEY}",
        })
        with urllib.request.urlopen(req) as resp:
            rows = json_lib.loads(resp.read().decode())
        if not rows:
            return jsonify({"error": "No published floor plan found"}), 404
        return jsonify(rows[0]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/venues/validate', methods=['POST'])
def api_validate_floorplan():
    """Validate a floor plan graph structure."""
    try:
        data = request.json or {}
        graph_json = data.get('graph_json', {})
        nodes = graph_json.get('nodes', {})
        edges = graph_json.get('edges', [])

        issues = []

        if not nodes:
            issues.append("Graph has no nodes")
        if not edges:
            issues.append("Graph has no edges")

        node_ids = set(nodes.keys())
        for edge in edges:
            if edge.get('from') not in node_ids:
                issues.append(f"Edge references unknown node: {edge.get('from')}")
            if edge.get('to') not in node_ids:
                issues.append(f"Edge references unknown node: {edge.get('to')}")

        has_entrance = any(
            n.get('type') == 'entrance' for n in nodes.values()
        )
        if not has_entrance:
            issues.append("No entrance node found")

        has_exit = any(
            n.get('type') == 'exit' for n in nodes.values()
        )
        if not has_exit:
            issues.append("No exit node found")

        if not issues:
            visited = set()
            queue = [next(iter(node_ids))] if node_ids else []
            while queue:
                current = queue.pop(0)
                if current in visited:
                    continue
                visited.add(current)
                for edge in edges:
                    if edge.get('from') == current and edge.get('to') not in visited:
                        queue.append(edge.get('to'))

            if len(visited) != len(node_ids):
                issues.append(f"Graph is disconnected: {len(node_ids) - len(visited)} node(s) unreachable")

        return jsonify({
            "valid": len(issues) == 0,
            "issues": issues,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Run on 0.0.0.0 to allow mobile app access over local network
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting FindYoWay backend on port {port}")
    logger.info(f"Debug mode: {debug}")
    logger.info(f"Vision enabled: {vision_model is not None}")
    
    app.run(host='0.0.0.0', port=port, debug=debug, threaded=True)
