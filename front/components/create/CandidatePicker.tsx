'use client';

import {
    Badge,
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    HStack,
    IconButton,
    Input,
    Text,
    VStack,
} from '@chakra-ui/react';
import { DayPicker } from 'react-day-picker';
import { ja } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import { Plus, X } from 'lucide-react';
import { combineDateAndTime, formatDate, minutesBetween, toDayKey } from '@/lib/date';
import type { CandidateInput } from '@/types';

export const DEFAULT_START_TIME = '10:00';
export const DEFAULT_END_TIME = '11:00';

export interface CandidateDraft {
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
}

let draftSeq = 0;
function newDraftId() {
    draftSeq += 1;
    return `draft-${Date.now()}-${draftSeq}`;
}

/** Shift a "HH:mm" string by minutes, clamped to the same day */
export function shiftTime(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = Math.min(Math.max(h * 60 + m + minutes, 0), 23 * 60 + 59);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function isDraftValid(draft: CandidateDraft): boolean {
    return /^\d{2}:\d{2}$/.test(draft.startTime) && /^\d{2}:\d{2}$/.test(draft.endTime)
        && minutesBetween(draft.startTime, draft.endTime) > 0;
}

export function sortDrafts(drafts: CandidateDraft[]): CandidateDraft[] {
    return [...drafts].sort((a, b) => {
        const byDay = toDayKey(a.date).localeCompare(toDayKey(b.date));
        return byDay !== 0 ? byDay : a.startTime.localeCompare(b.startTime);
    });
}

/** Convert drafts to API payload (sorted, ISO datetimes with the browser's offset) */
export function draftsToCandidateInputs(drafts: CandidateDraft[]): CandidateInput[] {
    return sortDrafts(drafts).map((draft, index) => ({
        start_at: combineDateAndTime(draft.date, draft.startTime),
        end_at: combineDateAndTime(draft.date, draft.endTime),
        note: '',
        order: index,
    }));
}

interface CandidatePickerProps {
    value: CandidateDraft[];
    onChange: (drafts: CandidateDraft[]) => void;
    /** Hide days before today (default: true) */
    disablePast?: boolean;
    maxCandidates?: number;
}

export function CandidatePicker({ value, onChange, disablePast = true, maxCandidates = 100 }: CandidatePickerProps) {
    const selectedDays = Array.from(new Map(value.map((d) => [toDayKey(d.date), d.date])).values());
    const lastDraft = value[value.length - 1];
    const defaultStart = lastDraft?.startTime ?? DEFAULT_START_TIME;
    const defaultEnd = lastDraft?.endTime ?? DEFAULT_END_TIME;

    const toggleDay = (day: Date) => {
        const key = toDayKey(day);
        if (value.some((d) => toDayKey(d.date) === key)) {
            onChange(value.filter((d) => toDayKey(d.date) !== key));
        } else if (value.length < maxCandidates) {
            onChange(
                sortDrafts([...value, { id: newDraftId(), date: day, startTime: defaultStart, endTime: defaultEnd }])
            );
        }
    };

    const addSlot = (draft: CandidateDraft) => {
        if (value.length >= maxCandidates) return;
        const index = value.findIndex((d) => d.id === draft.id);
        const next = [...value];
        next.splice(index + 1, 0, {
            id: newDraftId(),
            date: draft.date,
            startTime: draft.endTime,
            endTime: shiftTime(draft.endTime, minutesBetween(draft.startTime, draft.endTime) || 60),
        });
        onChange(next);
    };

    const updateDraft = (id: string, patch: Partial<CandidateDraft>) => {
        onChange(value.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    };

    const removeDraft = (id: string) => {
        onChange(value.filter((d) => d.id !== id));
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <VStack align="stretch" spacing={4}>
            <Box
                borderRadius="lg"
                border="1px solid"
                borderColor="border.default"
                py={2}
                overflowX="auto"
                data-testid="candidate-calendar"
            >
                <DayPicker
                    mode="multiple"
                    locale={ja}
                    selected={selectedDays}
                    onDayClick={(day, modifiers) => {
                        if (!modifiers.disabled) toggleDay(day);
                    }}
                    disabled={disablePast ? { before: today } : undefined}
                    startMonth={disablePast ? today : undefined}
                    showOutsideDays
                    weekStartsOn={0}
                />
            </Box>

            <HStack justify="space-between">
                <Text fontWeight="medium">選択済み候補</Text>
                <Badge colorScheme="brand" fontSize="sm" data-testid="candidate-count">
                    {value.length}件
                </Badge>
            </HStack>

            {value.length === 0 ? (
                <Text color="text.muted" fontSize="sm" textAlign="center" py={4}>
                    カレンダーの日付をタップして候補日を追加してください
                </Text>
            ) : (
                <VStack as="ul" align="stretch" spacing={2} listStyleType="none" aria-label="選択済み候補">
                    {value.map((draft) => {
                        const invalid = !isDraftValid(draft);
                        const label = formatDate(draft.date, 'M/d(E)');
                        return (
                            <Box
                                as="li"
                                key={draft.id}
                                p={3}
                                borderRadius="lg"
                                bg="bg.subtle"
                                border="1px solid"
                                borderColor={invalid ? 'red.300' : 'transparent'}
                                data-testid="candidate-item"
                            >
                                <Flex align="center" gap={2} wrap="wrap">
                                    <Text fontWeight="bold" minW="72px">
                                        {label}
                                    </Text>
                                    <HStack spacing={1} flex="1" minW="200px">
                                        <FormControl w="auto">
                                            <FormLabel srOnly>{`${label} 開始時刻`}</FormLabel>
                                            <Input
                                                type="time"
                                                size="sm"
                                                bg="bg.card"
                                                value={draft.startTime}
                                                onChange={(e) => updateDraft(draft.id, { startTime: e.target.value })}
                                                step={300}
                                            />
                                        </FormControl>
                                        <Text aria-hidden>〜</Text>
                                        <FormControl w="auto" isInvalid={invalid}>
                                            <FormLabel srOnly>{`${label} 終了時刻`}</FormLabel>
                                            <Input
                                                type="time"
                                                size="sm"
                                                bg="bg.card"
                                                value={draft.endTime}
                                                onChange={(e) => updateDraft(draft.id, { endTime: e.target.value })}
                                                step={300}
                                            />
                                        </FormControl>
                                    </HStack>
                                    <HStack spacing={1}>
                                        <Button
                                            size="xs"
                                            variant="ghost"
                                            leftIcon={<Plus size={14} />}
                                            onClick={() => addSlot(draft)}
                                        >
                                            時間帯を追加
                                        </Button>
                                        <IconButton
                                            aria-label={`${label} ${draft.startTime}の候補を削除`}
                                            icon={<X size={16} />}
                                            size="sm"
                                            variant="ghost"
                                            colorScheme="red"
                                            onClick={() => removeDraft(draft.id)}
                                        />
                                    </HStack>
                                </Flex>
                                {invalid && (
                                    <Text fontSize="xs" color="red.500" mt={1} role="alert">
                                        終了時刻は開始時刻より後にしてください
                                    </Text>
                                )}
                            </Box>
                        );
                    })}
                </VStack>
            )}
        </VStack>
    );
}
