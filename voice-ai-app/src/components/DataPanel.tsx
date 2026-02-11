import type { DataRecord } from '../services/api';

const FIELD_LABELS: Record<string, string> = {
    name: '👤 ชื่อ',
    salary: '💰 เงินเดือน',
    date_of_birth: '🎂 วันเกิด',
};

interface DataPanelProps {
    data: DataRecord | null;
    changedFields: string[];
    status: 'connecting' | 'connected' | 'error';
    statusText: string;
}

export function DataPanel({ data, changedFields, status, statusText }: DataPanelProps) {
    return (
        <div className="data-panel">
            <div className="status-bar">
                <span className="status-bar__label">📁 ข้อมูลปัจจุบัน (data.json)</span>
                <span className="status-bar__indicator">
                    <span
                        className={`status-dot${status === 'connected'
                                ? ' status-dot--connected'
                                : status === 'error'
                                    ? ' status-dot--error'
                                    : ''
                            }`}
                    />
                    {statusText}
                </span>
            </div>

            <div className="data-grid">
                {!data ? (
                    <div className="data-item">
                        <span className="data-item__label" style={{ color: 'var(--c-danger)' }}>
                            ไม่สามารถโหลดข้อมูลได้
                        </span>
                    </div>
                ) : (
                    Object.entries(data).map(([key, value]) => {
                        const isChanged = changedFields.includes(key);
                        const displayValue =
                            key === 'salary' && typeof value === 'number'
                                ? value.toLocaleString('th-TH') + ' บาท'
                                : String(value);

                        return (
                            <div className="data-item" key={key}>
                                <span className="data-item__label">
                                    {FIELD_LABELS[key] || key}
                                </span>
                                <span
                                    className={`data-item__value${isChanged ? ' data-item__value--changed' : ''}`}
                                >
                                    {displayValue}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
