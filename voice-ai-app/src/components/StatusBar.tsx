interface StatusBarProps {
    status: 'connecting' | 'connected' | 'error';
    statusText: string;
}

export function StatusBar({ status, statusText }: StatusBarProps) {
    const dotClass =
        status === 'connected'
            ? 'status-dot status-dot--connected'
            : status === 'error'
                ? 'status-dot status-dot--error'
                : 'status-dot';

    return (
        <div className="status-bar">
            <span className="status-bar__label">📁 ข้อมูลปัจจุบัน (data.json)</span>
            <span className="status-bar__indicator">
                <span className={dotClass} />
                {statusText}
            </span>
        </div>
    );
}
