import type { AudioState } from '../hooks/useSpeechSynthesis';

export interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    isEditSuccess?: boolean;
    audioState?: AudioState;
}

function getAudioIndicator(state?: AudioState) {
    switch (state) {
        case 'loading':
            return <span className="audio-indicator audio-indicator--loading" title="กำลังเตรียมเสียง...">⏳</span>;
        case 'playing':
            return <span className="audio-indicator audio-indicator--playing" title="กำลังเล่นเสียง...">🔊</span>;
        case 'done':
            return <span className="audio-indicator audio-indicator--done" title="เล่นเสียงเสร็จแล้ว">✅</span>;
        case 'error':
            return <span className="audio-indicator audio-indicator--error" title="ไม่สามารถเล่นเสียงได้">🔇</span>;
        default:
            return null;
    }
}

interface ChatMessageProps {
    message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
    const baseClass =
        message.sender === 'user'
            ? 'message message--user'
            : message.isEditSuccess
                ? 'message message--ai message--ai-edit'
                : 'message message--ai';

    return (
        <div className={baseClass}>
            <span className="message__text">{message.text}</span>
            {message.sender === 'ai' && getAudioIndicator(message.audioState)}
        </div>
    );
}
