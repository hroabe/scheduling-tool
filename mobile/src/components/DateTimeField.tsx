/**
 * Date/time field — web implementation (the community picker has no web support).
 * Uses text input "YYYY-MM-DD", "HH:mm" or "YYYY-MM-DD HH:mm". Native: DateTimeField.native.tsx.
 */

import React, { useEffect, useState } from 'react';

import { parseLocalInput, toDateInput, toTimeInput } from '../lib/date';
import { Button, TextField } from './ui';
import type { DateTimeFieldProps } from './DateTimeField.types';

function toText(value: Date | null, mode: DateTimeFieldProps['mode']): string {
    if (!value) return '';
    if (mode === 'date') return toDateInput(value);
    if (mode === 'time') return toTimeInput(value);
    return `${toDateInput(value)} ${toTimeInput(value)}`;
}

const PLACEHOLDER = { date: 'YYYY-MM-DD', time: 'HH:mm', datetime: 'YYYY-MM-DD HH:mm' } as const;

export default function DateTimeField({ label, value, onChange, mode, error, onClear, clearLabel }: DateTimeFieldProps) {
    const [text, setText] = useState(toText(value, mode));
    const [invalid, setInvalid] = useState(false);

    useEffect(() => {
        setText(toText(value, mode));
    }, [value, mode]);

    const commit = () => {
        if (!text.trim()) {
            setInvalid(false);
            onClear?.();
            return;
        }
        const parsed = parseLocalInput(text, mode, value ?? new Date());
        setInvalid(!parsed);
        if (parsed) onChange(parsed);
    };

    return (
        <>
            <TextField
                label={label}
                value={text}
                onChangeText={setText}
                onBlur={commit}
                onSubmitEditing={commit}
                placeholder={PLACEHOLDER[mode]}
                autoCapitalize="none"
                autoCorrect={false}
                error={invalid ? `${PLACEHOLDER[mode]}` : error}
            />
            {onClear && value && clearLabel ? <Button title={clearLabel} onPress={onClear} variant="ghost" small /> : null}
        </>
    );
}
