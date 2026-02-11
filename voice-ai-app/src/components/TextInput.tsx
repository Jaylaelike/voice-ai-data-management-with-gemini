import { useState } from 'react';

interface TextInputProps {
    onSend: (text: string) => void;
    disabled: boolean;
}

export function TextInput({ onSend, disabled }: TextInputProps) {
    const [value, setValue] = useState('');

    function handleSend() {
        const text = value.trim();
        if (!text) return;
        onSend(text);
        setValue('');
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    return (
        <div className="text-input-container">
            <input
                type="text"
                className="text-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="พิมพ์ข้อความ เช่น 'ช่วยแก้เงินเดือนเป็น 25000 หน่อย'"
                disabled={disabled}
            />
            <button
                className="send-button"
                onClick={handleSend}
                disabled={disabled || !value.trim()}
            >
                ส่ง
            </button>
        </div>
    );
}
