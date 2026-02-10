# 🚀 Deployment Guide - คู่มือการใช้งาน

โปรเจ็กต์นี้มี **2 เวอร์ชัน** ให้เลือกใช้:

## 📌 เวอร์ชัน 1: Frontend Only (แนะนำสำหรับเริ่มต้น)

### ข้อดี
✅ ไม่ต้องติดตั้ง Backend  
✅ รันได้ทันทีด้วยไฟล์ HTML  
✅ เหมาะสำหรับทดสอบและใช้งานส่วนตัว  

### ข้อเสีย
⚠️ API Key เก็บในเบราว์เซอร์ (localStorage)  
⚠️ ไม่เหมาะสำหรับ production  

### ไฟล์ที่ใช้
- `index.html` - หน้าเว็บหลัก
- `app.js` - JavaScript logic

### วิธีใช้งาน

#### วิธีที่ 1: เปิดไฟล์โดยตรง
```bash
# Windows
start index.html

# macOS
open index.html

# Linux
xdg-open index.html
```

#### วิธีที่ 2: Python HTTP Server
```bash
python -m http.server 8000
# เปิด http://localhost:8000
```

#### วิธีที่ 3: VS Code Live Server
1. Install "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"

### การตั้งค่า
1. ไปที่ https://makersuite.google.com/app/apikey
2. สร้าง API Key
3. ใส่ API Key ในช่องที่หน้าเว็บ
4. เริ่มใช้งาน!

---

## 📌 เวอร์ชัน 2: Frontend + Backend (แนะนำสำหรับ Production)

### ข้อดี
✅ API Key เก็บบน server (ปลอดภัยกว่า)  
✅ สามารถควบคุมการใช้งานได้  
✅ เหมาะสำหรับใช้งานจริง  

### ข้อเสีย
⚠️ ต้องรัน Backend server  
⚠️ ซับซ้อนกว่าเล็กน้อย  

### ไฟล์ที่ใช้
- `index-backend.html` - Frontend
- `app-backend.js` - Frontend logic
- `backend/app.py` - Python Flask server
- `backend/requirements.txt` - Dependencies

### วิธีใช้งาน

#### ขั้นตอนที่ 1: Setup Backend
```bash
cd backend

# สร้าง virtual environment (แนะนำ)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# ติดตั้ง dependencies
pip install -r requirements.txt
```

#### ขั้นตอนที่ 2: ตั้งค่า Environment
```bash
# Copy template
cp .env.template .env

# แก้ไขไฟล์ .env
# ใส่ Gemini API Key:
# GEMINI_API_KEY=your_actual_api_key_here
```

#### ขั้นตอนที่ 3: รัน Backend
```bash
python app.py
# Backend จะรันที่ http://localhost:5000
```

#### ขั้นตอนที่ 4: รัน Frontend
เปิด Terminal ใหม่:
```bash
# กลับไปที่ root directory
cd ..

# รัน HTTP server
python -m http.server 8000

# เปิดเบราว์เซอร์ที่
# http://localhost:8000/index-backend.html
```

---

## 🌐 Deploy to Production

### Option 1: Deploy Frontend to GitHub Pages

1. Push โค้ดไป GitHub
2. ไปที่ Settings → Pages
3. เลือก branch และ folder
4. GitHub จะสร้าง URL ให้อัตโนมัติ

**หมายเหตุ:** ใช้ได้เฉพาะ Frontend Only version

### Option 2: Deploy Backend to Cloud

#### Heroku
```bash
# Install Heroku CLI
# Create Procfile
echo "web: python backend/app.py" > Procfile

# Deploy
heroku create your-app-name
heroku config:set GEMINI_API_KEY=your_key
git push heroku main
```

#### Railway
1. ไปที่ https://railway.app
2. Connect GitHub repository
3. Add environment variable: `GEMINI_API_KEY`
4. Deploy

#### Google Cloud Run
```bash
# สร้าง Dockerfile
# Deploy
gcloud run deploy thai-voice-chat \
  --source backend/ \
  --set-env-vars GEMINI_API_KEY=your_key
```

#### Render
1. ไปที่ https://render.com
2. Create new Web Service
3. Connect repository
4. Add environment variable
5. Deploy

### Option 3: Deploy ทั้งระบบบน VPS

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3-pip nginx

# ติดตั้ง dependencies
cd backend
pip3 install -r requirements.txt

# ตั้งค่า Nginx
sudo nano /etc/nginx/sites-available/voicechat

# ตัวอย่าง Nginx config:
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /var/www/voicechat;
        index index-backend.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/voicechat /etc/nginx/sites-enabled/
sudo systemctl restart nginx

# รัน Backend ด้วย systemd
sudo nano /etc/systemd/system/voicechat.service
```

---

## 🔒 Security Best Practices

### Frontend Only Version
- ใช้เฉพาะสำหรับทดสอบ/demo
- อย่าแชร์ API Key กับใคร
- ตั้ง API quota limits ใน Google Cloud Console

### Backend Version
- ใช้ `.env` file สำหรับ API keys
- อย่า commit `.env` เข้า git
- ตั้ง rate limiting
- ใช้ HTTPS ใน production
- ตั้ง CORS ให้ถูกต้อง

---

## 📊 Monitoring & Limits

### Gemini API Free Tier
- 15 requests/minute
- 1,500 requests/day

### ตรวจสอบการใช้งาน
- ไปที่ Google Cloud Console
- เช็ค API usage
- ตั้ง alerts สำหรับ quota

---

## 🆘 Troubleshooting

### Backend ไม่เริ่ม
```bash
# ตรวจสอบ port 5000 ว่าถูกใช้งานหรือไม่
# Windows:
netstat -ano | findstr :5000
# macOS/Linux:
lsof -i :5000

# ถ้ามีโปรแกรมใช้อยู่ ให้ kill process หรือเปลี่ยน port
```

### CORS Error
```python
# ตรวจสอบว่าติดตั้ง flask-cors แล้ว
pip install flask-cors

# ใน app.py ต้องมี:
from flask_cors import CORS
CORS(app)
```

### API Key ไม่ทำงาน
- ตรวจสอบว่า copy ถูกต้อง (ไม่มี space)
- ตรวจสอบว่า enable Generative Language API แล้ว
- ลอง generate key ใหม่

---

## 📝 สรุป

| Feature | Frontend Only | Frontend + Backend |
|---------|--------------|-------------------|
| ความยาก | ⭐ ง่าย | ⭐⭐ ปานกลาง |
| ความปลอดภัย | ⭐⭐ พอใช้ | ⭐⭐⭐⭐ ดี |
| เหมาะสำหรับ | Demo, Test | Production |
| ต้องการ Server | ❌ ไม่ต้อง | ✅ ต้อง |

**คำแนะนำ:**
- เริ่มต้นด้วย Frontend Only version
- เมื่อต้องการใช้งานจริง ให้ migrate ไป Backend version
