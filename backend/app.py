"""
Optional Python Backend for Thai Voice Chat
This provides better security by keeping API key on server side
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import re
import json
import logging
from logging.handlers import RotatingFileHandler
from dotenv import load_dotenv

load_dotenv()

# Configure logging to file with rotation
LOG_DIR = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)
LOG_PATH = os.path.join(LOG_DIR, 'app.log')

logger = logging.getLogger('voice_chat_backend')
logger.setLevel(logging.INFO)
if not logger.handlers:
    file_handler = RotatingFileHandler(LOG_PATH, maxBytes=1_000_000, backupCount=3)
    formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Get API key from environment variable
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

# Path to data.json
DATA_JSON_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data.json')


def load_data_json():
    """Load data.json file."""
    try:
        with open(DATA_JSON_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load data.json: {e}")
        return None


def save_data_json(data):
    """Save data to data.json file."""
    try:
        with open(DATA_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        return True
    except Exception as e:
        logger.error(f"Failed to save data.json: {e}")
        return False


def sanitize_for_speech(text: str) -> str:
    """Remove emoji, markdown, and symbols that break TTS."""
    if not text:
        return ''
    cleaned = text
    # Remove emoji / pictographs
    cleaned = re.sub(
        r'[\U0001F300-\U0001FAFF\u2600-\u27BF]', '', cleaned
    )
    # Strip markdown bold/italic while keeping content
    cleaned = re.sub(r'(\*\*|__)(.*?)\1', r'\2', cleaned)
    cleaned = re.sub(r'(\*|_)(.*?)\1', r'\2', cleaned)
    # Inline code
    cleaned = re.sub(r'`{1,3}(.*?)`{1,3}', r'\1', cleaned)
    # Headings
    cleaned = re.sub(r'^\s*#{1,6}\s+', '', cleaned, flags=re.MULTILINE)
    # Block-quotes
    cleaned = re.sub(r'^\s*>\s+', '', cleaned, flags=re.MULTILINE)
    # List bullets
    cleaned = re.sub(r'^\s*[-*+]\s+', '', cleaned, flags=re.MULTILINE)
    # Leftover formatting chars
    cleaned = re.sub(r'[\*`_]', '', cleaned)
    # Collapse whitespace
    cleaned = re.sub(r'\s{2,}', ' ', cleaned).strip()
    return cleaned or text

@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Handle chat requests from frontend
    """
    if not GEMINI_API_KEY:
        return jsonify({'error': 'API key not configured'}), 500
    
    try:
        data = request.json
        user_message = data.get('message', '')
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        logger.info("/api/chat request", extra={
            'user_message_preview': user_message[:100]
        })

        # Call Gemini API
        response = requests.post(
            f'{GEMINI_API_URL}?key={GEMINI_API_KEY}',
            json={
                'contents': [{
                    'parts': [{
                        'text': user_message
                    }]
                }],
                'generationConfig': {
                    'temperature': 0.9,
                    'topK': 40,
                    'topP': 0.95,
                    'maxOutputTokens': 1024,
                }
            },
            timeout=30
        )
        
        if response.status_code != 200:
            logger.error("Gemini API error", extra={
                'status_code': response.status_code,
                'body': response.text[:500]
            })
            return jsonify({
                'error': f'Gemini API error: {response.status_code}',
                'details': response.text
            }), response.status_code
        
        result = response.json()
        
        if 'candidates' in result and result['candidates']:
            ai_response = result['candidates'][0]['content']['parts'][0]['text']
            logger.info("/api/chat success", extra={'response_preview': ai_response[:200]})
            return jsonify({
                'response': ai_response,
                'status': 'success'
            })
        else:
            logger.error("No response from AI")
            return jsonify({'error': 'No response from AI'}), 500
            
    except requests.exceptions.Timeout:
        logger.error("Request timeout to Gemini API")
        return jsonify({'error': 'Request timeout'}), 504
    except requests.exceptions.RequestException as e:
        logger.exception("Request to Gemini API failed")
        return jsonify({'error': f'Request failed: {str(e)}'}), 500
    except Exception as e:
        logger.exception("Unhandled server error")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'api_configured': bool(GEMINI_API_KEY)
    })


# ── Data Chat: Chat with LLM to view/edit data.json ──

DATA_CHAT_SYSTEM_PROMPT = """คุณเป็นผู้ช่วย AI ที่จัดการข้อมูลของผู้ใช้ ข้อมูลปัจจุบันในระบบคือ:

{current_data}

ฟิลด์ที่มีอยู่: {fields}

กฎ:
1. ตอบเป็นภาษาไทยเท่านั้น
2. ถ้าผู้ใช้ขอแก้ไขข้อมูล ให้ตอบในรูปแบบ JSON ที่มีโครงสร้างดังนี้:
   {{"reply": "ข้อความตอบกลับภาษาไทย", "edits": {{"field_name": "new_value"}}}}
3. ถ้าผู้ใช้ถามดูข้อมูลหรือคุยเรื่องอื่น ให้ตอบ:
   {{"reply": "ข้อความตอบกลับภาษาไทย", "edits": null}}
4. ค่า salary ต้องเป็นตัวเลข (number) ไม่ใช่ string
5. ค่า date_of_birth ต้องอยู่ในรูปแบบ "YYYY-MM-DD"
6. ค่า name ต้องเป็น string
7. ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่นนอก JSON
"""


@app.route('/api/data', methods=['GET'])
def get_data():
    """Return current data.json content."""
    data = load_data_json()
    if data is None:
        return jsonify({'error': 'ไม่สามารถอ่านไฟล์ data.json ได้'}), 500
    return jsonify(data)


@app.route('/api/data-chat', methods=['POST'])
def data_chat():
    """
    Chat endpoint that can read/edit data.json via LLM.
    User sends a Thai message, LLM decides whether to edit data or just respond.
    """
    if not GEMINI_API_KEY:
        return jsonify({'error': 'API key not configured'}), 500

    try:
        req_data = request.json
        user_message = req_data.get('message', '')
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400

        # Load current data
        current_data = load_data_json()
        if current_data is None:
            return jsonify({'error': 'ไม่สามารถอ่านไฟล์ data.json ได้'}), 500

        fields = ', '.join(current_data.keys())
        system_prompt = DATA_CHAT_SYSTEM_PROMPT.format(
            current_data=json.dumps(current_data, ensure_ascii=False, indent=2),
            fields=fields
        )

        logger.info("/api/data-chat request", extra={
            'user_message_preview': user_message[:100]
        })

        # Build conversation with system prompt + user message
        response = requests.post(
            f'{GEMINI_API_URL}?key={GEMINI_API_KEY}',
            json={
                'contents': [
                    {
                        'role': 'user',
                        'parts': [{'text': system_prompt}]
                    },
                    {
                        'role': 'model',
                        'parts': [{'text': '{"reply": "สวัสดีครับ! ผมพร้อมช่วยจัดการข้อมูลให้คุณแล้ว ต้องการแก้ไขหรือดูข้อมูลอะไรครับ?", "edits": null}'}]
                    },
                    {
                        'role': 'user',
                        'parts': [{'text': user_message}]
                    }
                ],
                'generationConfig': {
                    'temperature': 0.3,
                    'topK': 20,
                    'topP': 0.9,
                    'maxOutputTokens': 1024,
                    'responseMimeType': 'application/json',
                }
            },
            timeout=30
        )

        if response.status_code != 200:
            logger.error("Gemini API error in data-chat", extra={
                'status_code': response.status_code,
                'body': response.text[:500]
            })
            return jsonify({
                'error': f'Gemini API error: {response.status_code}',
                'details': response.text
            }), response.status_code

        result = response.json()

        if 'candidates' not in result or not result['candidates']:
            return jsonify({'error': 'No response from AI'}), 500

        ai_text = result['candidates'][0]['content']['parts'][0]['text']
        logger.info("/api/data-chat AI raw response", extra={'raw': ai_text[:500]})

        # Parse LLM JSON response
        try:
            ai_json = json.loads(ai_text)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code blocks
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', ai_text)
            if json_match:
                ai_json = json.loads(json_match.group(1).strip())
            else:
                # Fallback: treat as plain text reply
                ai_json = {'reply': ai_text, 'edits': None}

        reply = ai_json.get('reply', 'ขออภัย ไม่สามารถประมวลผลได้')
        edits = ai_json.get('edits', None)
        data_changed = False

        if edits and isinstance(edits, dict):
            for field, value in edits.items():
                if field in current_data:
                    current_data[field] = value
                    data_changed = True
                    logger.info(f"Data edited: {field} = {value}")

            if data_changed:
                if not save_data_json(current_data):
                    return jsonify({
                        'error': 'แก้ไขข้อมูลไม่สำเร็จ ไม่สามารถบันทึกไฟล์ได้'
                    }), 500

        logger.info("/api/data-chat success", extra={
            'reply_preview': reply[:200],
            'data_changed': data_changed
        })

        return jsonify({
            'response': reply,
            'data': current_data,
            'data_changed': data_changed,
            'status': 'success'
        })

    except requests.exceptions.Timeout:
        logger.error("Request timeout to Gemini API in data-chat")
        return jsonify({'error': 'Request timeout'}), 504
    except Exception as e:
        logger.exception("Unhandled error in data-chat")
        return jsonify({'error': f'Server error: {str(e)}'}), 500


if __name__ == '__main__':
    if not GEMINI_API_KEY:
        print("⚠️  WARNING: GEMINI_API_KEY not set in environment variables")
        print("Please create a .env file with: GEMINI_API_KEY=your_key_here")
    else:
        print("✅ Gemini API Key configured")
    
    print("\n🚀 Starting Thai Voice Chat Backend...")
    print("📡 Frontend should connect to: http://localhost:4000")
    print("\n")
    
    app.run(debug=True, host='0.0.0.0', port=4000)
