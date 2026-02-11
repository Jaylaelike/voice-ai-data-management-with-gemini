const EXAMPLES = [
    'ช่วยแก้เงินเดือนเป็น 25000 หน่อย',
    'แก้ชื่อเป็น สมชาย',
    'แก้วันเกิดเป็น 1995-06-15',
    'ดูข้อมูลของฉันหน่อย',
    'เงินเดือนฉันเท่าไหร่',
];

interface ExampleChipsProps {
    onSelect: (text: string) => void;
}

export function ExampleChips({ onSelect }: ExampleChipsProps) {
    return (
        <div className="examples">
            <div className="examples__title">💡 ตัวอย่างคำสั่ง</div>
            <div className="example-chips">
                {EXAMPLES.map((ex) => (
                    <button
                        key={ex}
                        className="example-chip"
                        onClick={() => onSelect(ex)}
                    >
                        {ex}
                    </button>
                ))}
            </div>
        </div>
    );
}
