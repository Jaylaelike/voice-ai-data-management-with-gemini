@echo off
chcp 65001 >nul
cls

echo =======================================
echo   Thai Voice Chat - Startup Script
echo =======================================
echo.

REM ตรวจสอบว่าอยู่ใน directory ที่ถูกต้อง
if not exist "index.html" (
    echo ❌ Error: กรุณารันสคริปต์นี้ใน root directory ของโปรเจ็กต์
    pause
    exit /b 1
)

echo เลือกเวอร์ชันที่ต้องการรัน:
echo 1. Frontend Only (รันทันที ไม่ต้อง backend)
echo 2. Frontend + Backend (ปลอดภัยกว่า)
echo.
set /p choice="เลือก (1 หรือ 2): "

if "%choice%"=="1" goto frontend_only
if "%choice%"=="2" goto full_stack
echo ❌ ตัวเลือกไม่ถูกต้อง
pause
exit /b 1

:frontend_only
echo.
echo 🚀 กำลังรัน Frontend Only version...
echo 📡 เปิดเบราว์เซอร์ที่ http://localhost:8000/index-data-chat.html
echo.
echo 💡 อย่าลืมใส่ Gemini API Key ในหน้าเว็บ!
echo.
echo กด Ctrl+C เพื่อหยุด
echo.
python -m http.server 8000
goto end

:full_stack
echo.
echo 🔍 ตรวจสอบ backend...

REM ตรวจสอบว่ามี .env file หรือไม่
if not exist "backend\.env" (
    echo ⚠️  ไม่พบไฟล์ .env
    echo กำลังสร้างจาก template...
    copy backend\.env.template backend\.env >nul
    echo ✅ สร้างไฟล์ .env เรียบร้อย
    echo.
    echo ⚠️  กรุณาแก้ไขไฟล์ backend\.env และใส่ Gemini API Key
    echo จากนั้นรันสคริปต์นี้อีกครั้ง
    pause
    exit /b 1
)

REM ตรวจสอบว่าติดตั้ง dependencies แล้วหรือไม่
python -c "import flask" 2>nul
if errorlevel 1 (
    echo 📦 ติดตั้ง Python dependencies...
    pip install -r backend\requirements.txt
    echo ✅ ติดตั้งเรียบร้อย
)

echo.
echo 🚀 กำลังรัน Backend + Frontend...
echo.

REM รัน backend ใน window ใหม่
start "Backend Server" cmd /k "cd backend && python app.py"

REM รอ backend เริ่มต้น
timeout /t 3 /nobreak >nul

echo 📡 Voice Chat: http://localhost:8000/index-backend.html
echo 📡 Data Chat:  http://localhost:8000/index-data-chat.html
echo 📡 Backend API: http://localhost:4000
echo.
echo กด Ctrl+C เพื่อหยุด Frontend
echo Backend จะรันใน window แยก (ปิดได้เอง)
echo.

REM รัน frontend
python -m http.server 8000

:end
pause
