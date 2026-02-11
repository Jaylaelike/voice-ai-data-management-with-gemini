import { TaskMode, TaskType } from '@heygen/streaming-avatar';
import { useCallback } from 'react';
import { AvatarSessionState, useAvatarContext } from './AvatarContext';

/**
 * Hook to make the avatar speak text.
 * Returns `speakText` function and `isActive` boolean indicating
 * whether the avatar session is available for speaking.
 */
export function useAvatarSpeak() {
    const { avatarRef, sessionState } = useAvatarContext();

    const isActive = sessionState === AvatarSessionState.CONNECTED;

    const speakText = useCallback(
        async (text: string) => {
            if (!avatarRef.current || sessionState !== AvatarSessionState.CONNECTED) {
                return false;
            }
            try {
                await avatarRef.current.speak({
                    text,
                    taskType: TaskType.TALK,
                    taskMode: TaskMode.ASYNC,
                });
                return true;
            } catch (error) {
                console.error('Avatar speak error:', error);
                return false;
            }
        },
        [avatarRef, sessionState],
    );

    return { speakText, isActive };
}
