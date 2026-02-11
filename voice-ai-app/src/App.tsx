import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { checkHealth, loadData, sendDataChatMessage } from './services/api';
import type { DataRecord } from './services/api';
import type { AudioState } from './hooks/useSpeechSynthesis';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { DataPanel } from './components/DataPanel';
import { ChatBox } from './components/ChatBox';
import { VoiceControls } from './components/VoiceControls';
import { TextInput } from './components/TextInput';
import { ExampleChips } from './components/ExampleChips';
import type { Message } from './components/ChatMessage';
import { AvatarProvider, AvatarPanel, useAvatarSpeak } from './avatar';

let msgIdCounter = 0;
function nextId(): string {
  return `msg-${++msgIdCounter}`;
}

/** Remove emoji, markdown, and symbols that break TTS. */
function sanitizeForSpeech(text: string): string {
  let cleaned = text;
  cleaned = cleaned.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
  cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2');
  cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2');
  cleaned = cleaned.replace(/`{1,3}(.*?)`{1,3}/g, '$1');
  cleaned = cleaned.replace(/^\s*#{1,6}\s+/gm, '');
  cleaned = cleaned.replace(/^\s*>\s+/gm, '');
  cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, '');
  cleaned = cleaned.replace(/[*`_]/g, '');
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  return cleaned || text;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  text: 'สวัสดีครับ! ผมช่วยดูหรือแก้ไขข้อมูลของคุณได้ และยังสามารถเช็คค่าฝุ่น PM2.5 หรือบอกเวลาปัจจุบันได้ด้วยครับ 😊',
  sender: 'ai',
};

function AppContent() {
  // ── State ──
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [data, setData] = useState<DataRecord | null>(null);
  const [changedFields, setChangedFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [statusText, setStatusText] = useState('กำลังเชื่อมต่อ...');
  const [voiceStatusText, setVoiceStatusText] = useState('พร้อมรับฟัง - กดไมค์เพื่อเริ่มพูด');
  const [voiceStatusType, setVoiceStatusType] = useState<'' | 'active' | 'error'>('');

  // ── Avatar speak hook ──
  const { speakText: avatarSpeak, stopSpeaking: stopAvatar, isActive: isAvatarActive } = useAvatarSpeak();

  // ── Ref for setMessages so we can call it from the speak function ──
  const setMessagesRef = useRef(setMessages);
  setMessagesRef.current = setMessages;

  // ── TTS: speak text — uses avatar if connected, otherwise browser TTS ──
  const speakWithIndicator = useCallback((text: string, msgId: string) => {
    // Try avatar first
    if (isAvatarActive) {
      const safeText = sanitizeForSpeech(text);
      avatarSpeak(safeText).then((ok) => {
        setMessagesRef.current((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, audioState: ok ? ('playing' as AudioState) : ('error' as AudioState) } : m))
        );
        if (ok) {
          // Mark done after a reasonable delay (avatar handles its own timing)
          setTimeout(() => {
            setMessagesRef.current((prev) =>
              prev.map((m) => (m.id === msgId ? { ...m, audioState: 'done' as AudioState } : m))
            );
          }, 3000);
        }
      });
      return;
    }

    // Fallback: browser TTS
    if (!('speechSynthesis' in window) || !text) {
      setMessagesRef.current((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, audioState: 'error' as AudioState } : m))
      );
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    setMessagesRef.current((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, audioState: 'loading' as AudioState } : m))
    );

    const safeText = sanitizeForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(safeText);
    utterance.lang = 'th-TH';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = synth.getVoices();
    const thaiVoice = voices.find((v) => v.lang.startsWith('th'));
    if (thaiVoice) utterance.voice = thaiVoice;

    utterance.onstart = () => {
      setMessagesRef.current((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, audioState: 'playing' as AudioState } : m))
      );
    };

    utterance.onend = () => {
      setMessagesRef.current((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, audioState: 'done' as AudioState } : m))
      );
    };

    utterance.onerror = () => {
      setMessagesRef.current((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, audioState: 'error' as AudioState } : m))
      );
    };

    synth.speak(utterance);
  }, [isAvatarActive, avatarSpeak]);

  // ── Load browser TTS voices on mount ──
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // ── Send message handler ──
  const handleSendMessage = useCallback(async (text: string) => {
    const userMsg: Message = { id: nextId(), text, sender: 'user' };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const result = await sendDataChatMessage(text);

      if (result.response) {
        const aiMsgId = nextId();
        const aiMsg: Message = {
          id: aiMsgId,
          text: result.response,
          sender: 'ai',
          isEditSuccess: result.data_changed,
          audioState: 'loading',
        };
        setMessages((prev) => [...prev, aiMsg]);

        // Trigger TTS — avatar or browser fallback
        speakWithIndicator(result.response, aiMsgId);
      }

      if (result.data) {
        setData(result.data);
        if (result.data_changed) {
          setChangedFields(Object.keys(result.data));
          setTimeout(() => setChangedFields([]), 2000);
        }
      }
    } catch (err) {
      const errorMsg: Message = {
        id: nextId(),
        text: 'ขอโทษครับ เกิดข้อผิดพลาด: ' + (err instanceof Error ? err.message : 'Unknown error'),
        sender: 'ai',
        audioState: 'error'
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [speakWithIndicator]);

  // ── Speech recognition callback ──
  const onSpeechResult = useCallback(
    (transcript: string) => {
      handleSendMessage(transcript);
    },
    [handleSendMessage]
  );

  const { isListening, isSupported, error: speechError, toggleListening } =
    useSpeechRecognition(onSpeechResult);

  // ── Handle Mic Toggle with TTS Cutoff ──
  const handleMicToggle = useCallback(() => {
    // 1. Stop any ongoing speech (Avatar or Browser)
    if (isAvatarActive) {
      stopAvatar();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // 2. Toggle mic
    toggleListening();
  }, [isAvatarActive, stopAvatar, toggleListening]);

  // ── Sync voice status text ──
  useEffect(() => {
    if (isListening) {
      setVoiceStatusText('กำลังฟัง... พูดได้เลย');
      setVoiceStatusType('active');
    } else if (speechError) {
      setVoiceStatusText(speechError);
      setVoiceStatusType('error');
    } else {
      setVoiceStatusText(
        isSupported
          ? 'พร้อมรับฟัง - กดไมค์เพื่อเริ่มพูด'
          : 'เบราว์เซอร์ของคุณไม่รองรับการรับรู้เสียง'
      );
      setVoiceStatusType(isSupported ? '' : 'error');
    }
  }, [isListening, speechError, isSupported]);

  // ── Init: check health & load data ──
  useEffect(() => {
    (async () => {
      try {
        const health = await checkHealth();
        if (health.status === 'healthy' && health.api_configured) {
          setConnectionStatus('connected');
          setStatusText('เชื่อมต่อแล้ว');
        } else {
          setConnectionStatus('error');
          setStatusText('ยังไม่ตั้งค่า API Key');
        }
      } catch {
        setConnectionStatus('error');
        setStatusText('ไม่สามารถเชื่อมต่อ backend');
      }

      try {
        const d = await loadData();
        setData(d);
      } catch {
        setData(null);
      }
    })();
  }, []);

  return (
    <div className="app-container glass-card">
      <header className="app-header">
        <h1 className="app-title">📋 Data Chat</h1>
        <p className="app-subtitle">พูดคุยกับ AI เพื่อดูหรือแก้ไขข้อมูลของคุณ</p>
      </header>

      <div className="layout-grid">
        {/* ── Left Panel: Avatar & Data ── */}
        <div className="left-panel">
          <AvatarPanel />

          <DataPanel
            data={data}
            changedFields={changedFields}
            status={connectionStatus}
            statusText={statusText}
          />
        </div>

        {/* ── Right Panel: Chat Interface ── */}
        <div className="right-panel">
          <ChatBox messages={messages} isLoading={isLoading} />

          <div className="chat-controls">
            <VoiceControls
              isListening={isListening}
              isSupported={isSupported}
              voiceStatus={voiceStatusText}
              voiceStatusType={voiceStatusType}
              onToggle={handleMicToggle}
            />

            <TextInput onSend={handleSendMessage} disabled={isLoading} />

            <ExampleChips onSelect={handleSendMessage} />
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AvatarProvider>
      <AppContent />
    </AvatarProvider>
  );
}

export default App;
