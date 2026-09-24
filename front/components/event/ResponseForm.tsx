'use client';

import { useMemo, useState } from 'react';
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
import { useAvailabilitySymbols } from '@/lib/availabilitySymbols';
import { formatDate, formatTime } from '@/lib/date';
import { useI18n } from '@/providers/I18nProvider';
import type { AttendanceStatus, Participant, ParticipantWithToken, Schedule } from '@/types';

interface ResponseFormProps {
    schedule: Schedule;
    /** Existing response to edit (requires editToken) */
    existing?: Participant | null;
    editToken?: string;
    onSuccess?: (participant: ParticipantWithToken, isUpdate: boolean) => void;
}

type FormValues = { name: string; comment?: string };

const STATUS_COLORS: Record<Exclude<AttendanceStatus, 'pending'>, string> = {
    ok: 'green',
    maybe: 'yellow',
    ng: 'red',
};

export function ResponseForm({ schedule, existing, editToken, onSuccess }: ResponseFormProps) {
    const toast = useToast();
    const { t } = useI18n();
    const symbols = useAvailabilitySymbols();
    const isUpdate = Boolean(existing && editToken);
    const [attendances, setAttendances] = useState<Map<number, AttendanceStatus>>(
        () => new Map((existing?.attendances ?? []).map((a) => [a.candidate, a.status]))
    );
    const [showMissing, setShowMissing] = useState(false);
    const { mutate: submitResponse, isPending } = useSubmitResponse(schedule.uuid);

    const schema = useMemo(
        () =>
            z.object({
                name: z
                    .string()
                    .trim()
                    .min(1, t('response.form.nameRequired'))
                    .max(100, t('response.form.nameTooLong')),
                comment: z.string().max(1000, t('response.form.commentTooLong')).optional(),
            }),
        [t]
    );

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { name: existing?.name ?? '', comment: existing?.comment ?? '' },
    });

    const allOptions: { value: Exclude<AttendanceStatus, 'pending'>; symbol: string }[] = [
        { value: 'ok', symbol: symbols.yes },
        { value: 'maybe', symbol: symbols.maybe },
        { value: 'ng', symbol: symbols.no },
    ];
    const options = schedule.allow_maybe ? allOptions : allOptions.filter((o) => o.value !== 'maybe');
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
                        title: t('response.form.error'),
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
                <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label={t('response.form.ariaLabel')}>
                    <VStack spacing={6} align="stretch">
                        <FormControl isRequired isInvalid={!!errors.name}>
                            <FormLabel>{t('response.form.name')}</FormLabel>
                            <Input
                                {...register('name')}
                                placeholder={t('response.form.namePlaceholder')}
                                size="lg"
                                autoComplete="name"
                            />
                            <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
                        </FormControl>

                        <Box as="fieldset">
                            <Text as="legend" fontWeight="medium" mb={1}>
                                {t('response.form.attendanceLegend')}
                            </Text>
                            <HStack spacing={4} fontSize="sm" color="text.muted" mb={3} flexWrap="wrap" data-testid="symbol-legend">
                                {options.map((option) => (
                                    <Text key={option.value}>
                                        {option.symbol} {t(`response.status.${option.value}`)}
                                    </Text>
                                ))}
                            </HStack>

                            <VStack spacing={3}>
                                {schedule.candidates.map((candidate) => {
                                    const selected = attendances.get(candidate.id);
                                    const missing = showMissing && (!selected || selected === 'pending');
                                    const dateLabel = `${formatDate(candidate.start_at, t('event.format.dayLong'))} ${formatTime(
                                        candidate.start_at
                                    )}-${formatTime(candidate.end_at)}`;
                                    return (
                                        <Box
                                            key={candidate.id}
                                            w="full"
                                            p={4}
                                            borderRadius="lg"
                                            border="1px solid"
                                            borderColor={missing ? 'red.400' : 'border.default'}
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
                                                    <Text fontWeight="bold">{formatDate(candidate.start_at, t('event.format.dayLong'))}</Text>
                                                    <Text fontSize="sm" color="text.muted">
                                                        {formatTime(candidate.start_at)} - {formatTime(candidate.end_at)}
                                                    </Text>
                                                    {candidate.note && (
                                                        <Text fontSize="xs" color="text.muted" mt={1}>
                                                            {candidate.note}
                                                        </Text>
                                                    )}
                                                </Box>

                                                <ButtonGroup
                                                    size="lg"
                                                    isAttached={false}
                                                    spacing={2}
                                                    role="group"
                                                    aria-label={t('response.form.candidateGroup', { date: dateLabel })}
                                                >
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
                                                                colorScheme={isSelected ? STATUS_COLORS[option.value] : 'gray'}
                                                                aria-pressed={isSelected}
                                                                aria-label={t('response.form.optionLabel', {
                                                                    date: dateLabel,
                                                                    status: t(`response.status.${option.value}`),
                                                                })}
                                                                onClick={() => setAttendance(candidate.id, option.value)}
                                                            >
                                                                {option.symbol}
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
                                <Text color="red.500" _dark={{ color: 'red.300' }} fontSize="sm" mt={2} role="alert">
                                    {t('response.form.missing', { count: unanswered.length })}
                                </Text>
                            )}
                        </Box>

                        <FormControl isInvalid={!!errors.comment}>
                            <FormLabel>{t('response.form.comment')}</FormLabel>
                            <Textarea {...register('comment')} placeholder={t('response.form.commentPlaceholder')} rows={3} />
                            <FormErrorMessage>{errors.comment?.message}</FormErrorMessage>
                        </FormControl>

                        <Button
                            type="submit"
                            size="lg"
                            leftIcon={<Send size={18} />}
                            isLoading={isPending}
                            loadingText={t('response.form.sending')}
                        >
                            {isUpdate ? t('response.form.update') : t('response.form.submit')}
                        </Button>
                    </VStack>
                </form>
            </CardBody>
        </Card>
    );
}
