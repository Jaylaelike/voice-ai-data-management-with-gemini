import { useEffect, useRef } from 'react';
import { AvatarSessionState } from './AvatarContext';
import { useAvatarSession } from './useAvatarSession';

export function AvatarPanel() {
    const { sessionState, stream, startSession, stopSession } = useAvatarSession();
    const videoRef = useRef<HTMLVideoElement>(null);

    // Pipe the HeyGen media stream into the <video> element
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
                videoRef.current!.play();
            };
        }
    }, [stream]);

    const isConnected = sessionState === AvatarSessionState.CONNECTED;
    const isConnecting = sessionState === AvatarSessionState.CONNECTING;

    return (
        <div className="avatar-panel">
            <div className="avatar-video-container">
                {isConnected ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="avatar-video"
                    >
                        <track kind="captions" />
                    </video>
                ) : (
                    <div className="avatar-placeholder">
                        <div className="avatar-placeholder-icon">🤖</div>
                        <p className="avatar-placeholder-text">
                            {isConnecting ? 'กำลังเชื่อมต่อ Avatar...' : 'กดเริ่มเพื่อเปิด AI Avatar'}
                        </p>
                    </div>
                )}
            </div>

            <div className="avatar-controls">
                {isConnected ? (
                    <button className="avatar-btn avatar-btn--stop" onClick={stopSession}>
                        ⏹ หยุด Avatar
                    </button>
                ) : (
                    <button
                        className="avatar-btn avatar-btn--start"
                        onClick={startSession}
                        disabled={isConnecting}
                    >
                        {isConnecting ? '⏳ กำลังเชื่อมต่อ...' : '▶ เริ่ม AI Avatar'}
                    </button>
                )}
                {isConnected && (
                    <span className="avatar-status-badge">
                        <span className="avatar-status-dot" />
                        กำลังทำงาน
                    </span>
                )}
            </div>
        </div>
    );
}
