import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeechRecognitionHook {
    isListening: boolean;
    isSupported: boolean;
    transcript: string;
    error: string;
    startListening: () => void;
    stopListening: () => void;
    toggleListening: () => void;
}

// Web Speech API types (not in standard lib)
interface SpeechRecognitionEvent {
    results: { [index: number]: { [index: number]: { transcript: string } } };
}

interface SpeechRecognitionErrorEvent {
    error: string;
}

interface SpeechRecognitionInstance {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onstart: (() => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
}

declare global {
    interface Window {
        SpeechRecognition?: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    }
}

export function useSpeechRecognition(
    onResult?: (transcript: string) => void
): SpeechRecognitionHook {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState('');
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

    // Store onResult in a ref so the useEffect doesn't re-run when the callback changes
    const onResultRef = useRef(onResult);
    onResultRef.current = onResult;

    const isSupported =
        typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    // Initialize recognition ONCE — never re-create it
    useEffect(() => {
        if (!isSupported) return;

        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.lang = 'th-TH';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            setIsListening(true);
            setError('');
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const text = event.results[0][0].transcript;
            setTranscript(text);
            // Call the latest callback via ref
            onResultRef.current?.(text);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            if (event.error === 'no-speech') {
                setError('ไม่ได้ยินเสียงพูด กรุณาลองใหม่อีกครั้ง');
            } else if (event.error === 'aborted') {
                // Silently handle aborted — user cancelled or page navigated
                setError('');
            } else if (event.error === 'not-allowed') {
                setError('กรุณาอนุญาตการใช้ไมโครโฟนในเบราว์เซอร์');
            } else {
                setError('เกิดข้อผิดพลาด: ' + event.error);
            }
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            try { recognition.stop(); } catch { /* ignore */ }
            recognition.onstart = null;
            recognition.onresult = null;
            recognition.onerror = null;
            recognition.onend = null;
        };
    }, [isSupported]); // Only depends on isSupported — no callback dependency

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            setError('');
            try {
                recognitionRef.current.start();
            } catch {
                setError('ไม่สามารถเริ่มฟังได้ กรุณาลองใหม่');
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    }, [isListening]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    return {
        isListening,
        isSupported,
        transcript,
        error,
        startListening,
        stopListening,
        toggleListening,
    };
}
