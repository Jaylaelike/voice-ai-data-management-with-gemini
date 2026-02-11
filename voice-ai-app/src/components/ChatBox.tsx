import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import type { Message } from './ChatMessage';

interface ChatBoxProps {
    messages: Message[];
    isLoading: boolean;
}

export function ChatBox({ messages, isLoading }: ChatBoxProps) {
    const boxRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (boxRef.current) {
            boxRef.current.scrollTop = boxRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    return (
        <div className="chat-box" ref={boxRef}>
            {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && (
                <div className="loading-indicator">⏳ กำลังประมวลผล...</div>
            )}
        </div>
    );
}
