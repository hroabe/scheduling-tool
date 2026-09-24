'use client';

import { useId } from 'react';
import { Button, HStack, Input, Text, VisuallyHidden, Wrap, WrapItem } from '@chakra-ui/react';
import { useI18n } from '@/providers/I18nProvider';
import { DURATION_PRESETS, MAX_CUSTOM_DURATION, type DurationPreset } from './candidates';

interface DurationPresetChipsProps {
    value: DurationPreset;
    customValue: number;
    onChange: (preset: DurationPreset) => void;
    onCustomChange: (minutes: number) => void;
    /** Accessible name of the chip group */
    label: string;
}

/** 30 / 60 / 90 / 120 / custom duration chips (radio-like, RFC-0013 §2.4) */
export function DurationPresetChips({ value, customValue, onChange, onCustomChange, label }: DurationPresetChipsProps) {
    const { t } = useI18n();
    const customId = useId();

    const chip = (key: string, isActive: boolean, onClick: () => void, text: string) => (
        <WrapItem key={key}>
            <Button
                size="sm"
                minW="60px"
                role="radio"
                aria-checked={isActive}
                variant={isActive ? 'solid' : 'outline'}
                colorScheme={isActive ? 'brand' : 'gray'}
                onClick={onClick}
            >
                {text}
            </Button>
        </WrapItem>
    );

    return (
        <Wrap spacing={2} align="center" role="radiogroup" aria-label={label}>
            {DURATION_PRESETS.map((minutes) =>
                chip(String(minutes), value === minutes, () => onChange(minutes), t('create.minutes', { count: minutes }))
            )}
            {chip('custom', value === 'custom', () => onChange('custom'), t('create.customDuration'))}
            {value === 'custom' && (
                <WrapItem>
                    <HStack spacing={1}>
                        <VisuallyHidden as="label" htmlFor={customId}>
                            {t('create.customDurationLabel')}
                        </VisuallyHidden>
                        <Input
                            id={customId}
                            type="number"
                            inputMode="numeric"
                            size="sm"
                            w="80px"
                            bg="bg.card"
                            min={1}
                            max={MAX_CUSTOM_DURATION}
                            value={customValue || ''}
                            onChange={(e) => {
                                const next = Math.floor(Number(e.target.value));
                                onCustomChange(Number.isFinite(next) ? Math.min(Math.max(next, 0), MAX_CUSTOM_DURATION) : 0);
                            }}
                        />
                        <Text fontSize="sm" color="text.muted" aria-hidden>
                            {t('create.minuteUnit')}
                        </Text>
                    </HStack>
                </WrapItem>
            )}
        </Wrap>
    );
}
