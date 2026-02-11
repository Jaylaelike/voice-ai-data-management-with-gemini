import sys
import os
import json
import asyncio
import logging

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, load_data_json, save_data_json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_chat_endpoint():
    print("Testing /api/chat endpoint...")
    
    # Create test client
    client = app.test_client()
    
    # 1. Test General Chat
    print("\n--- Test 1: General Chat ---")
    response = client.post('/api/chat', json={'message': 'สวัสดีครับ แนะนำตัวหน่อย'})
    if response.status_code == 200:
        print("Success:", response.json['response'])
    else:
        print("Failed:", response.status_code, response.text)

    # 2. Test PM2.5 (Tool Usage)
    print("\n--- Test 2: PM2.5 Query ---")
    response = client.post('/api/chat', json={'message': 'ขอข้อมูล PM2.5 ของกรุงเทพหน่อย'})
    if response.status_code == 200:
        print("Success:", response.json['response'])
    else:
        print("Failed:", response.status_code, response.text)

    # 3. Test Data Edit
    print("\n--- Test 3: Data Edit ---")
    # Reset data first to known state
    original_data = load_data_json()
    test_data = original_data.copy() if original_data else {}
    test_data['name'] = "TestUser"
    save_data_json(test_data)
    
    response = client.post('/api/chat', json={'message': 'เปลี่ยนชื่อเป็น สมชาย ให้หน่อย'})
    if response.status_code == 200:
        res_json = response.json
        print("Response:", res_json.get('response'))
        print("Data Changed:", res_json.get('data_changed'))
        print("Updated Data:", res_json.get('updated_data'))
        
        if res_json.get('data_changed') and res_json['updated_data'].get('name') == 'สมชาย':
            print("PASS: Data updated correctly")
        else:
            print("FAIL: Data not updated")
            
    else:
        print("Failed:", response.status_code, response.text)

    # Restore data
    if original_data:
        save_data_json(original_data)

if __name__ == "__main__":
    test_chat_endpoint()
