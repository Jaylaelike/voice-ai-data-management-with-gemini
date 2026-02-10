#!/bin/bash

# Thai Voice Chat - Run Script
# สคริปต์สำหรับรันโปรเจ็กต์แบบง่าย

echo "🎤 Thai Voice Chat - Startup Script"
echo "=================================="
echo ""

# ตรวจสอบว่าอยู่ใน directory ที่ถูกต้อง
if [ ! -f "index.html" ]; then
    echo "❌ Error: กรุณารันสคริปต์นี้ใน root directory ของโปรเจ็กต์"
    exit 1
fi

echo "เลือกเวอร์ชันที่ต้องการรัน:"
echo "1) Frontend Only (รันทันที ไม่ต้อง backend)"
echo "2) Frontend + Backend (ปลอดภัยกว่า)"
echo ""
read -p "เลือก (1 หรือ 2): " choice

case $choice in
    1)
        echo ""
        echo "🚀 กำลังรัน Frontend Only version..."
        echo "📡 เปิดเบราว์เซอร์ที่ http://localhost:8000/index-data-chat.html"
        echo ""
        echo "💡 อย่าลืมใส่ Gemini API Key ในหน้าเว็บ!"
        echo ""
        python3 -m http.server 8000
        ;;
    2)
        echo ""
        echo "🔍 ตรวจสอบ backend..."
        
        # ตรวจสอบว่ามี .env file หรือไม่
        if [ ! -f "backend/.env" ]; then
            echo "⚠️  ไม่พบไฟล์ .env"
            echo "กำลังสร้างจาก template..."
            cp backend/.env.template backend/.env
            echo "✅ สร้างไฟล์ .env เรียบร้อย"
            echo ""
            echo "⚠️  กรุณาแก้ไขไฟล์ backend/.env และใส่ Gemini API Key"
            echo "จากนั้นรันสคริปต์นี้อีกครั้ง"
            exit 1
        fi
        
        # ตรวจสอบว่าติดตั้ง dependencies แล้วหรือไม่
        if ! python3 -c "import flask" 2>/dev/null; then
            echo "📦 ติดตั้ง Python dependencies..."
            pip3 install -r backend/requirements.txt
            echo "✅ ติดตั้งเรียบร้อย"
        fi
        
        echo ""
        echo "🚀 กำลังรัน Backend + Frontend..."
        echo ""
        
        # รัน backend ใน background
        cd backend
        python3 app.py &
        BACKEND_PID=$!
        cd ..
        
        # รอ backend เริ่มต้น
        sleep 3
        
        # รัน frontend
        echo "📡 Voice Chat: http://localhost:8000/index-backend.html"
        echo "📡 Data Chat:  http://localhost:8000/index-data-chat.html"
        echo "📡 Backend API: http://localhost:4000"
        echo ""
        echo "กด Ctrl+C เพื่อหยุด"
        echo ""
        
        python3 -m http.server 8000
        
        # หยุด backend เมื่อ frontend หยุด
        kill $BACKEND_PID 2>/dev/null
        ;;
    *)
        echo "❌ ตัวเลือกไม่ถูกต้อง"
        exit 1
        ;;
esac
