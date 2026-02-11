import { useCallback, useRef } from 'react';

interface SpeechSynthesisHook {
    speak: (text: string) => void;
    cancel: () => void;
    isSupported: boolean;
}

/** Remove emoji, markdown, and symbols that break TTS. */
function sanitizeForSpeech(text: string): string {
    let cleaned = text;
    // Remove emoji / pictographs
    cleaned = cleaned.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
    // Strip markdown bold/italic
    cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2');
    cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2');
    // Inline code
    cleaned = cleaned.replace(/`{1,3}(.*?)`{1,3}/g, '$1');
    // Headings
    cleaned = cleaned.replace(/^\s*#{1,6}\s+/gm, '');
    // Block-quotes
    cleaned = cleaned.replace(/^\s*>\s+/gm, '');
    // List bullets
    cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, '');
    // Leftover formatting chars
    cleaned = cleaned.replace(/[*`_]/g, '');
    // Collapse whitespace
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
    return cleaned || text;
}

export type AudioState = 'idle' | 'loading' | 'playing' | 'done' | 'error';

export function useSpeechSynthesis(
    onAudioStateChange?: (state: AudioState) => void
): SpeechSynthesisHook {
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const isSupported =
        typeof window !== 'undefined' && 'speechSynthesis' in window;

    const speak = useCallback(
        (text: string) => {
            if (!text || !isSupported) {
                onAudioStateChange?.('error');
                return;
            }

            // Stop any currently playing speech
            window.speechSynthesis.cancel();
            onAudioStateChange?.('loading');

            const safeText = sanitizeForSpeech(text);
            const utterance = new SpeechSynthesisUtterance(safeText);
            utterance.lang = 'th-TH';
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 1;

            // Select Thai voice if available
            const voices = window.speechSynthesis.getVoices();
            const thaiVoice = voices.find((v) => v.lang.startsWith('th'));
            if (thaiVoice) {
                utterance.voice = thaiVoice;
            }

            utterance.onstart = () => onAudioStateChange?.('playing');
            utterance.onend = () => onAudioStateChange?.('done');
            utterance.onerror = () => onAudioStateChange?.('error');

            utteranceRef.current = utterance;
            window.speechSynthesis.speak(utterance);
        },
        [isSupported, onAudioStateChange]
    );

    const cancel = useCallback(() => {
        if (isSupported) {
            window.speechSynthesis.cancel();
        }
    }, [isSupported]);

    return { speak, cancel, isSupported };
}
