'use client';

/**
 * Pick one or more days on a calendar and a time range; back-to-back slots of the
 * meeting length are generated for every selected day. Used on /booking/new and the
 * host page.
 */

import { useState } from 'react';
import { Box, Button, FormControl, FormLabel, HStack, Select, Text, VStack, useToast } from '@chakra-ui/react';
import { DayPicker } from 'react-day-picker';
import { de, enUS, es, fr, ja, ko, ptBR, zhCN } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import { Plus } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { useI18n } from '@/providers/I18nProvider';
import type { SlotInput } from '@/types';
import { generateSlots, TIME_OPTIONS } from './slotUtils';

const DAY_PICKER_LOCALES = { ja, en: enUS, zh: zhCN, ko, es, fr, de, pt: ptBR } satisfies Record<Locale, unknown>;

interface SlotGeneratorProps {
    durationMinutes: number;
    onGenerate: (slots: SlotInput[]) => void | Promise<void>;
    isAdding?: boolean;
}

export function SlotGenerator({ durationMinutes, onGenerate, isAdding }: SlotGeneratorProps) {
    const { t, locale } = useI18n();
    const toast = useToast();
    const [days, setDays] = useState<Date[]>([]);
    const [startTime, setStartTime] = useState('10:00');
    const [endTime, setEndTime] = useState('17:00');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rangeInvalid = startTime >= endTime;

    const handleGenerate = async () => {
        const slots = generateSlots(days, startTime, endTime, durationMinutes);
        if (slots.length === 0) {
            toast({ title: t('booking.generator.noSlots'), status: 'warning', duration: 4000 });
            return;
        }
        await onGenerate(slots);
        setDays([]);
    };

    return (
        <VStack align="stretch" spacing={4}>
            <Box
                borderRadius="lg"
                border="1px solid"
                borderColor="border.default"
                py={2}
                overflowX="auto"
                display="flex"
                justifyContent="center"
                data-testid="slot-calendar"
            >
                <DayPicker
                    mode="multiple"
                    locale={DAY_PICKER_LOCALES[locale] ?? ja}
                    selected={days}
                    onSelect={(selected) => setDays(selected ?? [])}
                    disabled={{ before: today }}
                    startMonth={today}
                    weekStartsOn={0}
                />
            </Box>
            <Text fontSize="sm" color="text.muted" aria-live="polite">
                {days.length > 0 ? t('booking.generator.selectedDays', { count: days.length }) : t('booking.generator.pickDays')}
            </Text>
            <HStack spacing={3} align="flex-end">
                <FormControl isInvalid={rangeInvalid}>
                    <FormLabel fontSize="sm">{t('booking.generator.from')}</FormLabel>
                    <Select size="sm" value={startTime} onChange={(e) => setStartTime(e.target.value)}>
                        {TIME_OPTIONS.map((time) => (
                            <option key={time} value={time}>
                                {time}
                            </option>
                        ))}
                    </Select>
                </FormControl>
                <FormControl isInvalid={rangeInvalid}>
                    <FormLabel fontSize="sm">{t('booking.generator.to')}</FormLabel>
                    <Select size="sm" value={endTime} onChange={(e) => setEndTime(e.target.value)}>
                        {[...TIME_OPTIONS.slice(1), '23:59'].map((time) => (
                            <option key={time} value={time}>
                                {time}
                            </option>
                        ))}
                    </Select>
                </FormControl>
            </HStack>
            {rangeInvalid && (
                <Text fontSize="sm" color="red.500" role="alert">
                    {t('booking.generator.invalidRange')}
                </Text>
            )}
            <Text fontSize="xs" color="text.muted">
                {t('booking.generator.hint', { minutes: durationMinutes })}
            </Text>
            <Button
                variant="outline"
                leftIcon={<Plus size={16} aria-hidden />}
                onClick={handleGenerate}
                isDisabled={days.length === 0 || rangeInvalid}
                isLoading={isAdding}
                data-testid="generate-slots"
            >
                {t('booking.generator.add')}
            </Button>
        </VStack>
    );
}
