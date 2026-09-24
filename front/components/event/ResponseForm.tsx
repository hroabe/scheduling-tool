'use client';

import { useState } from 'react';
import {
    Box,
    Button,
    ButtonGroup,
    Card,
    CardBody,
    Flex,
    FormControl,
    FormErrorMessage,
    FormLabel,
    HStack,
    Input,
    Text,
    Textarea,
    VStack,
    useToast,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useSubmitResponse } from '@/hooks/useApi';
import { formatDate, formatTime } from '@/lib/date';
import type { AttendanceStatus, Participant, ParticipantWithToken, Schedule } from '@/types';

interface ResponseFormProps {
    schedule: Schedule;
    /** Existing response to edit (requires editToken) */
    existing?: Participant | null;
    editToken?: string;
    onSuccess?: (participant: ParticipantWithToken, isUpdate: boolean) => void;
}

const schema = z.object({
    name: z.string().trim().min(1, 'お名前を入力してください').max(100, '100文字以内で入力してください'),
    comment: z.string().max(1000, '1000文字以内で入力してください').optional(),
});

type FormValues = z.infer<typeof schema>;

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; aria: string; color: string }[] = [
    { value: 'ok', label: '◯', aria: '参加可能', color: 'green' },
    { value: 'maybe', label: '△', aria: '調整可能', color: 'yellow' },
    { value: 'ng', label: '×', aria: '参加不可', color: 'red' },
];

export function ResponseForm({ schedule, existing, editToken, onSuccess }: ResponseFormProps) {
    const toast = useToast();
    const isUpdate = Boolean(existing && editToken);
    const [attendances, setAttendances] = useState<Map<number, AttendanceStatus>>(
        () => new Map((existing?.attendances ?? []).map((a) => [a.candidate, a.status]))
    );
    const [showMissing, setShowMissing] = useState(false);
    const { mutate: submitResponse, isPending } = useSubmitResponse(schedule.uuid);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { name: existing?.name ?? '', comment: existing?.comment ?? '' },
    });

    const options = schedule.allow_maybe ? STATUS_OPTIONS : STATUS_OPTIONS.filter((o) => o.value !== 'maybe');
    const unanswered = schedule.candidates.filter((c) => {
        const status = attendances.get(c.id);
        return !status || status === 'pending';
    });

    const setAttendance = (candidateId: number, status: AttendanceStatus) => {
        setAttendances((prev) => new Map(prev).set(candidateId, status));
    };

    const onSubmit = (values: FormValues) => {
        if (unanswered.length > 0) {
            setShowMissing(true);
            return;
        }
        submitResponse(
            {
                response: {
                    name: values.name.trim(),
                    comment: values.comment?.trim() || '',
                    attendances: schedule.candidates.map((c) => ({
                        candidate: c.id,
                        status: attendances.get(c.id) ?? 'pending',
                    })),
                },
                editToken: isUpdate ? editToken : undefined,
            },
            {
                onSuccess: (participant) => onSuccess?.(participant, isUpdate),
                onError: (error) => {
                    toast({
                        title: '回答を送信できませんでした',
                        description: error.message,
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                    });
                },
            }
        );
    };

    return (
        <Card>
            <CardBody>
                <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="出欠回答フォーム">
                    <VStack spacing={6} align="stretch">
                        <FormControl isRequired isInvalid={!!errors.name}>
                            <FormLabel>お名前</FormLabel>
                            <Input {...register('name')} placeholder="例: 佐藤花子" size="lg" autoComplete="name" />
                            <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
                        </FormControl>

                        <Box as="fieldset">
                            <Text as="legend" fontWeight="medium" mb={3}>
                                各候補日の出欠を選択してください
                            </Text>

                            <VStack spacing={3}>
                                {schedule.candidates.map((candidate) => {
                                    const selected = attendances.get(candidate.id);
                                    const missing = showMissing && (!selected || selected === 'pending');
                                    const dateLabel = `${formatDate(candidate.start_at, 'M月d日(E)')} ${formatTime(candidate.start_at)}〜${formatTime(candidate.end_at)}`;
                                    return (
                                        <Box
                                            key={candidate.id}
                                            w="full"
                                            p={4}
                                            borderRadius="lg"
                                            border="1px solid"
                                            borderColor={missing ? 'red.300' : 'border.default'}
                                            bg="bg.subtle"
                                            data-testid="response-candidate"
                                        >
                                            <Flex
                                                direction={{ base: 'column', sm: 'row' }}
                                                justify="space-between"
                                                align={{ base: 'stretch', sm: 'center' }}
                                                gap={3}
                                            >
                                                <Box>
                                                    <HStack spacing={2}>
                                                        <Text fontWeight="bold">{formatDate(candidate.start_at, 'M月d日')}</Text>
                                                        <Text color="text.muted">({formatDate(candidate.start_at, 'E')})</Text>
                                                    </HStack>
                                                    <Text fontSize="sm" color="text.muted">
                                                        {formatTime(candidate.start_at)} - {formatTime(candidate.end_at)}
                                                    </Text>
                                                    {candidate.note && (
                                                        <Text fontSize="xs" color="text.muted" mt={1}>
                                                            {candidate.note}
                                                        </Text>
                                                    )}
                                                </Box>

                                                <ButtonGroup size="lg" isAttached={false} spacing={2} role="group" aria-label={`${dateLabel}の出欠`}>
                                                    {options.map((option) => {
                                                        const isSelected = selected === option.value;
                                                        return (
                                                            <Button
                                                                key={option.value}
                                                                type="button"
                                                                flex={{ base: 1, sm: 'none' }}
                                                                minW="60px"
                                                                fontSize="xl"
                                                                variant={isSelected ? 'solid' : 'outline'}
                                                                colorScheme={isSelected ? option.color : 'gray'}
                                                                aria-pressed={isSelected}
                                                                aria-label={`${dateLabel}: ${option.aria}`}
                                                                onClick={() => setAttendance(candidate.id, option.value)}
                                                            >
                                                                {option.label}
                                                            </Button>
                                                        );
                                                    })}
                                                </ButtonGroup>
                                            </Flex>
                                        </Box>
                                    );
                                })}
                            </VStack>
                            {showMissing && unanswered.length > 0 && (
                                <Text color="red.500" fontSize="sm" mt={2} role="alert">
                                    未選択の候補日が{unanswered.length}件あります
                                </Text>
                            )}
                        </Box>

                        <FormControl isInvalid={!!errors.comment}>
                            <FormLabel>コメント（任意）</FormLabel>
                            <Textarea {...register('comment')} placeholder="その他連絡事項があればご記入ください" rows={3} />
                            <FormErrorMessage>{errors.comment?.message}</FormErrorMessage>
                        </FormControl>

                        <Button
                            type="submit"
                            size="lg"
                            leftIcon={<Send size={18} />}
                            isLoading={isPending}
                            loadingText="送信中..."
                        >
                            {isUpdate ? '回答を更新する' : '回答を送信する'}
                        </Button>
                    </VStack>
                </form>
            </CardBody>
        </Card>
    );
}
