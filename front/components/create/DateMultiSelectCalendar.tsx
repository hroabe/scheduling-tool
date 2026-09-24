'use client';

import { forwardRef, useMemo, useRef } from 'react';
import { Badge, Box, Button, HStack, Text } from '@chakra-ui/react';
import { DayPicker } from 'react-day-picker';
import { de, enUS, es, fr, ja, ko, ptBR, zhCN } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import { toDayKey } from '@/lib/date';
import { useI18n } from '@/providers/I18nProvider';
import { parseDayKey } from './candidates';

const DAY_PICKER_LOCALES = { ja, en: enUS, zh: zhCN, ko, es, fr, de, pt: ptBR };

interface DateMultiSelectCalendarProps {
    /** Selected local days ("yyyy-MM-dd"), sorted */
    selectedDates: string[];
    onSelectDates: (dates: string[]) => void;
    /** Disable days before today (default: true) */
    disablePast?: boolean;
}

function startOfToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

/** Every day between two days (inclusive), in order */
function daysBetween(a: Date, b: Date): string[] {
    const [from, to] = a <= b ? [a, b] : [b, a];
    const result: string[] = [];
    const cursor = new Date(from);
    while (cursor <= to) {
        result.push(toDayKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
    return result;
}

/**
 * Multi-date calendar (RFC-0013 §2.3). Click/tap toggles a day, Shift+click selects the
 * range from the previously clicked day. Built on react-day-picker for keyboard navigation
 * and localized accessible labels.
 */
export const DateMultiSelectCalendar = forwardRef<HTMLDivElement, DateMultiSelectCalendarProps>(
    function DateMultiSelectCalendar({ selectedDates, onSelectDates, disablePast = true }, ref) {
        const { t, locale } = useI18n();
        const anchorRef = useRef<string | null>(null);
        const today = useMemo(startOfToday, []);
        const selected = useMemo(() => selectedDates.map(parseDayKey), [selectedDates]);

        const handleDayClick = (day: Date, disabled: boolean, shiftKey: boolean) => {
            if (disabled) return;
            const key = toDayKey(day);
            const anchor = anchorRef.current;
            if (shiftKey && anchor && anchor !== key) {
                const range = daysBetween(parseDayKey(anchor), day).filter(
                    (d) => !disablePast || parseDayKey(d) >= today
                );
                onSelectDates(Array.from(new Set([...selectedDates, ...range])).sort());
            } else if (selectedDates.includes(key)) {
                onSelectDates(selectedDates.filter((d) => d !== key));
            } else {
                onSelectDates([...selectedDates, key].sort());
            }
            anchorRef.current = key;
        };

        return (
            <Box>
                <Box
                    ref={ref}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor="border.default"
                    bg="bg.card"
                    py={2}
                    display="flex"
                    justifyContent="center"
                    overflowX="auto"
                    data-testid="candidate-calendar"
                    sx={{
                        '--rdp-accent-color': 'var(--chakra-colors-brand-500)',
                        '--rdp-accent-background-color': 'var(--chakra-colors-brand-subtle)',
                        '--rdp-day-width': '42px',
                        '--rdp-day-height': '42px',
                        '--rdp-day_button-width': '40px',
                        '--rdp-day_button-height': '40px',
                        '.rdp-root': { margin: 0 },
                    }}
                >
                    <DayPicker
                        mode="multiple"
                        locale={DAY_PICKER_LOCALES[locale] ?? ja}
                        selected={selected}
                        onDayClick={(day, modifiers, e) => handleDayClick(day, !!modifiers.disabled, e.shiftKey)}
                        disabled={disablePast ? { before: today } : undefined}
                        startMonth={disablePast ? today : undefined}
                        showOutsideDays
                        weekStartsOn={0}
                    />
                </Box>
                <HStack justify="space-between" mt={1} spacing={2} wrap="wrap">
                    <Text fontSize="xs" color="text.muted">
                        {t('create.calendarHint')}
                    </Text>
                    {selectedDates.length > 0 && (
                        <HStack spacing={2}>
                            <Badge colorScheme="brand" aria-live="polite" data-testid="selected-days-count">
                                {t('create.selectedDays', { count: selectedDates.length })}
                            </Badge>
                            <Button
                                size="xs"
                                variant="ghost"
                                colorScheme="gray"
                                onClick={() => {
                                    anchorRef.current = null;
                                    onSelectDates([]);
                                }}
                            >
                                {t('create.clearSelection')}
                            </Button>
                        </HStack>
                    )}
                </HStack>
            </Box>
        );
    }
);
