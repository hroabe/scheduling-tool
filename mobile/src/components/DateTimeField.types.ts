export type DateTimeMode = 'date' | 'time' | 'datetime';

export interface DateTimeFieldProps {
    label: string;
    value: Date | null;
    onChange: (value: Date) => void;
    mode: DateTimeMode;
    minimumDate?: Date;
    placeholder?: string;
    error?: string | null;
    /** Show a "clear" action (optional fields such as the deadline) */
    onClear?: () => void;
    clearLabel?: string;
}
