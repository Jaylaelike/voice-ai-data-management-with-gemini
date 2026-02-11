import StreamingAvatar, {
    AvatarQuality,
    StreamingEvents,
    VoiceChatTransport,
    VoiceEmotion,
    STTProvider,
    ElevenLabsModel,
} from '@heygen/streaming-avatar';
import type { StartAvatarRequest } from '@heygen/streaming-avatar';
import { useCallback } from 'react';
import { AvatarSessionState, useAvatarContext } from './AvatarContext';

const AVATAR_CONFIG: StartAvatarRequest = {
    quality: AvatarQuality.Low,
    avatarName: 'Ann_Therapist_public',
    voice: {
        rate: 1.5,
        emotion: VoiceEmotion.EXCITED,
        model: ElevenLabsModel.eleven_flash_v2_5,
    },
    language: 'en',
    voiceChatTransport: VoiceChatTransport.WEBSOCKET,
    sttSettings: {
        provider: STTProvider.DEEPGRAM,
    },
};

/** Fetch an access token via the Vite proxy → HeyGen API */
async function fetchAccessToken(): Promise<string> {
    const res = await fetch('/heygen/v1/streaming.create_token', {
        method: 'POST',
    });
    if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
    const data = await res.json();
    return data.data.token;
}

export function useAvatarSession() {
    const {
        avatarRef,
        sessionState,
        setSessionState,
        stream,
        setStream,
        setIsAvatarTalking,
    } = useAvatarContext();

    const startSession = useCallback(async () => {
        if (sessionState !== AvatarSessionState.INACTIVE) return;

        try {
            setSessionState(AvatarSessionState.CONNECTING);

            // 1. Get token
            const token = await fetchAccessToken();

            // 2. Create SDK instance
            avatarRef.current = new StreamingAvatar({ token });

            // 3. Register events
            avatarRef.current.on(StreamingEvents.STREAM_READY, ({ detail }: { detail: MediaStream }) => {
                setStream(detail);
                setSessionState(AvatarSessionState.CONNECTED);
            });

            avatarRef.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
                setStream(null);
                setSessionState(AvatarSessionState.INACTIVE);
                setIsAvatarTalking(false);
            });

            avatarRef.current.on(StreamingEvents.AVATAR_START_TALKING, () => {
                setIsAvatarTalking(true);
            });

            avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
                setIsAvatarTalking(false);
            });

            // 4. Start the avatar
            await avatarRef.current.createStartAvatar(AVATAR_CONFIG);
        } catch (error) {
            console.error('Error starting avatar session:', error);
            setSessionState(AvatarSessionState.INACTIVE);
        }
    }, [sessionState, avatarRef, setSessionState, setStream, setIsAvatarTalking]);

    const stopSession = useCallback(async () => {
        if (!avatarRef.current) return;
        try {
            await avatarRef.current.stopAvatar();
        } catch {
            // ignore cleanup errors
        }
        avatarRef.current = null;
        setStream(null);
        setIsAvatarTalking(false);
        setSessionState(AvatarSessionState.INACTIVE);
    }, [avatarRef, setSessionState, setStream, setIsAvatarTalking]);

    return {
        sessionState,
        stream,
        startSession,
        stopSession,
    };
}
