import StreamingAvatar from '@heygen/streaming-avatar';
import React, { useRef, useState } from 'react';

// ── Session State ──
export const AvatarSessionState = {
    INACTIVE: 'inactive',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
} as const;

export type AvatarSessionState = (typeof AvatarSessionState)[keyof typeof AvatarSessionState];

// ── Context shape ──
interface AvatarContextProps {
    avatarRef: React.MutableRefObject<StreamingAvatar | null>;
    sessionState: AvatarSessionState;
    setSessionState: (s: AvatarSessionState) => void;
    stream: MediaStream | null;
    setStream: (s: MediaStream | null) => void;
    isAvatarTalking: boolean;
    setIsAvatarTalking: (v: boolean) => void;
}

const AvatarContext = React.createContext<AvatarContextProps>({
    avatarRef: { current: null },
    sessionState: AvatarSessionState.INACTIVE,
    setSessionState: () => { },
    stream: null,
    setStream: () => { },
    isAvatarTalking: false,
    setIsAvatarTalking: () => { },
});

// ── Provider ──
export function AvatarProvider({ children }: { children: React.ReactNode }) {
    const avatarRef = useRef<StreamingAvatar>(null);
    const [sessionState, setSessionState] = useState<AvatarSessionState>(AvatarSessionState.INACTIVE);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isAvatarTalking, setIsAvatarTalking] = useState(false);

    return (
        <AvatarContext.Provider
            value={{
                avatarRef,
                sessionState,
                setSessionState,
                stream,
                setStream,
                isAvatarTalking,
                setIsAvatarTalking,
            }}
        >
            {children}
        </AvatarContext.Provider>
    );
}

// ── Hook ──
export function useAvatarContext() {
    return React.useContext(AvatarContext);
}
