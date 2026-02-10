// Data Chat Application - Chat with LLM to view/edit data.json
const BACKEND_URL = 'http://localhost:4000';
let recognition;
let isListening = false;

// DOM Elements
const chatBox = document.getElementById('chatBox');
const textInput = document.getElementById('textInput');
const sendButton = document.getElementById('sendButton');
const loading = document.getElementById('loading');
const dataGrid = document.getElementById('dataGrid');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const micButton = document.getElementById('micButton');
const voiceStatus = document.getElementById('voiceStatus');

// Field label mapping (English -> Thai)
const FIELD_LABELS = {
    name: '👤 ชื่อ',
    salary: '💰 เงินเดือน',
    date_of_birth: '🎂 วันเกิด',
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkHealth();
    loadData();
    initSpeechRecognition();
});

// Speech Recognition Setup
function initSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showVoiceStatus('เบราว์เซอร์ของคุณไม่รองรับการรับรู้เสียง', 'error');
        micButton.disabled = true;
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();

    recognition.lang = 'th-TH';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        isListening = true;
        micButton.classList.add('listening');
        showVoiceStatus('กำลังฟัง... พูดได้เลย', 'active');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        addMessage(transcript, 'user');
        sendMessageText(transcript);
    };

    recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
            showVoiceStatus('ไม่ได้ยินเสียงพูด กรุณาลองใหม่อีกครั้ง', 'error');
        } else {
            showVoiceStatus('เกิดข้อผิดพลาด: ' + event.error, 'error');
        }
        resetMicButton();
    };

    recognition.onend = () => {
        resetMicButton();
    };

    micButton.addEventListener('click', toggleListening);
}

// Toggle Listening
function toggleListening() {
    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

// Reset Mic Button
function resetMicButton() {
    isListening = false;
    micButton.classList.remove('listening');
    showVoiceStatus('พร้อมรับฟัง - กดไมค์เพื่อเริ่มพูด');
}

// Check backend health
async function checkHealth() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/health`);
        const data = await res.json();
        if (data.status === 'healthy' && data.api_configured) {
            statusDot.className = 'status-dot connected';
            statusText.textContent = 'เชื่อมต่อแล้ว';
        } else {
            statusDot.className = 'status-dot error';
            statusText.textContent = 'ยังไม่ตั้งค่า API Key';
        }
    } catch {
        statusDot.className = 'status-dot error';
        statusText.textContent = 'ไม่สามารถเชื่อมต่อ backend';
    }
}

// Load and display current data
async function loadData() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/data`);
        const data = await res.json();
        renderDataPanel(data);
    } catch {
        dataGrid.innerHTML = '<div class="data-item"><span class="label" style="color:#dc2626">ไม่สามารถโหลดข้อมูลได้</span></div>';
    }
}

// Render the data panel
function renderDataPanel(data, changedFields = []) {
    dataGrid.innerHTML = '';
    for (const [key, value] of Object.entries(data)) {
        const item = document.createElement('div');
        item.className = 'data-item';

        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = FIELD_LABELS[key] || key;

        const val = document.createElement('span');
        val.className = 'value';
        if (changedFields.includes(key)) {
            val.classList.add('changed');
        }

        // Format display value
        if (key === 'salary' && typeof value === 'number') {
            val.textContent = value.toLocaleString('th-TH') + ' บาท';
        } else {
            val.textContent = value;
        }

        item.appendChild(label);
        item.appendChild(val);
        dataGrid.appendChild(item);
    }
}

// Send message
async function sendMessage() {
    const text = textInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    textInput.value = '';
    await sendMessageText(text);
}

async function sendMessageText(text) {
    loading.classList.add('active');
    sendButton.disabled = true;

    try {
        const res = await fetch(`${BACKEND_URL}/api/data-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text }),
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'ไม่สามารถประมวลผลได้');
        }

        const result = await res.json();

        if (result.response) {
            const isEdit = result.data_changed;
            const msgEl = addMessage(result.response, 'ai', isEdit);
            speak(result.response, msgEl);
        }

        // Update data panel if data changed
        if (result.data) {
            const changedFields = result.data_changed
                ? Object.keys(result.data) // highlight all on change (simple approach)
                : [];
            renderDataPanel(result.data, result.data_changed ? changedFields : []);
        }
    } catch (err) {
        console.error('Error:', err);
        addMessage('ขอโทษครับ เกิดข้อผิดพลาด: ' + err.message, 'ai');
    } finally {
        loading.classList.remove('active');
        sendButton.disabled = false;
    }
}

// Add message to chat
function addMessage(text, sender, isEditSuccess = false) {
    const div = document.createElement('div');
    div.className = `message ${sender}-message`;
    if (sender === 'ai' && isEditSuccess) {
        div.classList.add('edit-success');
    }

    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    div.appendChild(textSpan);

    // Add audio indicator for AI messages
    if (sender === 'ai') {
        const audioIndicator = document.createElement('span');
        audioIndicator.className = 'audio-indicator';
        audioIndicator.innerHTML = '🔊';
        audioIndicator.title = 'กำลังเตรียมเสียง...';
        div.appendChild(audioIndicator);
    }

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
}

// Use example chip
function useExample(el) {
    textInput.value = el.textContent;
    textInput.focus();
}

// Show voice status
function showVoiceStatus(message, type = '') {
    voiceStatus.textContent = message;
    voiceStatus.className = 'voice-status';
    if (type) {
        voiceStatus.classList.add(type);
    }
}

// Text-to-Speech via Web Speech API
function updateAudioIndicator(msgEl, state) {
    if (!msgEl) return;
    const indicator = msgEl.querySelector('.audio-indicator');
    if (!indicator) return;

    switch (state) {
        case 'loading':
            indicator.innerHTML = '⏳';
            indicator.title = 'กำลังเตรียมเสียง...';
            indicator.className = 'audio-indicator loading';
            break;
        case 'playing':
            indicator.innerHTML = '🔊';
            indicator.title = 'กำลังเล่นเสียง...';
            indicator.className = 'audio-indicator playing';
            break;
        case 'done':
            indicator.innerHTML = '✅';
            indicator.title = 'เล่นเสียงเสร็จแล้ว';
            indicator.className = 'audio-indicator done';
            break;
        case 'error':
            indicator.innerHTML = '🔇';
            indicator.title = 'ไม่สามารถเล่นเสียงได้';
            indicator.className = 'audio-indicator error';
            break;
    }
}

function speak(text, msgEl) {
    if (!text) return;

    if (!('speechSynthesis' in window)) {
        console.warn('⚠️ Browser speech synthesis not available');
        updateAudioIndicator(msgEl, 'error');
        return;
    }

    // Stop any currently playing speech
    window.speechSynthesis.cancel();

    updateAudioIndicator(msgEl, 'loading');

    const safeText = sanitizeForSpeech(text);
    console.log('🔊 Web Speech API TTS:', safeText.substring(0, 50) + '...');

    const utterance = new SpeechSynthesisUtterance(safeText);
    utterance.lang = 'th-TH';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const thaiVoice = voices.find(voice => voice.lang.startsWith('th'));
    if (thaiVoice) {
        utterance.voice = thaiVoice;
        console.log('🎤 Using Thai voice:', thaiVoice.name);
    }

    utterance.onstart = () => {
        console.log('▶️ Speech started');
        updateAudioIndicator(msgEl, 'playing');
    };
    utterance.onend = () => {
        console.log('✅ Speech finished');
        updateAudioIndicator(msgEl, 'done');
    };
    utterance.onerror = (e) => {
        console.error('❌ Speech error:', e);
        updateAudioIndicator(msgEl, 'error');
    };

    window.speechSynthesis.speak(utterance);
}

function sanitizeForSpeech(text) {
    let cleaned = text;
    cleaned = cleaned.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
    cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2');
    cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2');
    cleaned = cleaned.replace(/`{1,3}(.*?)`{1,3}/g, '$1');
    cleaned = cleaned.replace(/^\s*#{1,6}\s+/gm, '');
    cleaned = cleaned.replace(/^\s*>\s+/gm, '');
    cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, '');
    cleaned = cleaned.replace(/[\*`_]/g, '');
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
    return cleaned || text;
}

// Load browser TTS voices
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
        const voices = window.speechSynthesis.getVoices();
        const thaiVoices = voices.filter(v => v.lang.startsWith('th'));
        console.log('🎤 Thai voices available:', thaiVoices.length > 0 ? thaiVoices.map(v => v.name).join(', ') : 'None');
    };
    window.speechSynthesis.getVoices();
}

