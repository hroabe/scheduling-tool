'use client';

import { HStack, Select, Text } from '@chakra-ui/react';
import { useI18n } from '@/providers/I18nProvider';
import { HOUR_OPTIONS, minuteOptions, pad2, timeFromParts, timeParts, type MinuteStep } from './candidates';

interface TimeSelectProps {
    /** Visible label of the field this time belongs to (used for accessible names) */
    label: string;
    value: string;
    onChange: (time: string) => void;
    minuteStep?: MinuteStep;
    isInvalid?: boolean;
    idPrefix?: string;
}

/** Hour + minute selects ("HH:mm"), keyboard- and screen-reader friendly */
export function TimeSelect({ label, value, onChange, minuteStep = 5, isInvalid, idPrefix }: TimeSelectProps) {
    const { t } = useI18n();
    const { hour, minute } = timeParts(value);

    return (
        <HStack spacing={1} role="group" aria-label={label}>
            <Select
                id={idPrefix ? `${idPrefix}-hour` : undefined}
                size="sm"
                w="72px"
                bg="bg.card"
                value={hour}
                isInvalid={isInvalid}
                aria-label={t('create.hourOf', { label })}
                onChange={(e) => onChange(timeFromParts(Number(e.target.value), minute))}
            >
                {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                        {pad2(h)}
                    </option>
                ))}
            </Select>
            <Text aria-hidden>:</Text>
            <Select
                id={idPrefix ? `${idPrefix}-minute` : undefined}
                size="sm"
                w="72px"
                bg="bg.card"
                value={minute}
                isInvalid={isInvalid}
                aria-label={t('create.minuteOf', { label })}
                onChange={(e) => onChange(timeFromParts(hour, Number(e.target.value)))}
            >
                {minuteOptions(minuteStep, minute).map((m) => (
                    <option key={m} value={m}>
                        {pad2(m)}
                    </option>
                ))}
            </Select>
        </HStack>
    );
}
