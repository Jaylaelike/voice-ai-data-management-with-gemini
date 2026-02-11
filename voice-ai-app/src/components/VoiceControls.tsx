interface VoiceControlsProps {
    isListening: boolean;
    isSupported: boolean;
    voiceStatus: string;
    voiceStatusType: '' | 'active' | 'error';
    onToggle: () => void;
}

export function VoiceControls({
    isListening,
    isSupported,
    voiceStatus,
    voiceStatusType,
    onToggle,
}: VoiceControlsProps) {
    const micClass = `mic-button${isListening ? ' mic-button--listening' : ''}`;
    const statusClass = `voice-status${voiceStatusType === 'active'
            ? ' voice-status--active'
            : voiceStatusType === 'error'
                ? ' voice-status--error'
                : ''
        }`;

    return (
        <div className="voice-controls">
            <button
                className={micClass}
                disabled={!isSupported}
                onClick={onToggle}
                title="กดเพื่อพูด"
                aria-label={isListening ? 'หยุดฟัง' : 'กดเพื่อพูด'}
            >
                🎤
            </button>
            <div className={statusClass}>{voiceStatus}</div>
        </div>
    );
}
