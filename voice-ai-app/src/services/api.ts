// ── API Service Layer ──

const BASE_URL = '';  // Uses Vite proxy in dev; set to backend URL in production

// ── Types ──

export interface HealthResponse {
    status: string;
    api_configured: boolean;
}

export interface DataRecord {
    [key: string]: string | number;
}

export interface ChatResponse {
    response: string;
    status: string;
}

export interface DataChatResponse {
    response: string;
    data: DataRecord;
    data_changed: boolean;
    status: string;
}

// ── Helpers ──

/** Fetch with timeout using AbortController */
async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs = 60000
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return res;
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw new Error('คำขอหมดเวลา — กรุณาลองใหม่อีกครั้ง');
        }
        throw new Error('ไม่สามารถเชื่อมต่อ backend ได้ — ตรวจสอบว่า backend กำลังทำงานอยู่');
    } finally {
        clearTimeout(timer);
    }
}

// ── API Functions ──

export async function checkHealth(): Promise<HealthResponse> {
    const res = await fetchWithTimeout(`${BASE_URL}/api/health`, {}, 5000);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return res.json();
}

export async function loadData(): Promise<DataRecord> {
    const res = await fetchWithTimeout(`${BASE_URL}/api/data`, {}, 10000);
    if (!res.ok) throw new Error(`Failed to load data: ${res.status}`);
    return res.json();
}

export async function sendChatMessage(message: string): Promise<ChatResponse> {
    const res = await fetchWithTimeout(
        `${BASE_URL}/api/chat`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
        },
        60000  // 60 seconds for AI response
    );
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `Chat failed: ${res.status}`);
    }
    return res.json();
}

export async function sendDataChatMessage(message: string): Promise<DataChatResponse> {
    const res = await fetchWithTimeout(
        `${BASE_URL}/api/data-chat`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
        },
        60000  // 60 seconds for AI response
    );
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `Data chat failed: ${res.status}`);
    }
    return res.json();
}
