'use client';

/**
 * ResponseForm - SaaS-quality response form component
 * 
 * Features:
 * - Clean, modern layout with proper spacing
 * - Segmented control for availability selection
 * - Per-candidate error validation
 * - Accessible keyboard navigation
 * - Desktop/Mobile responsive design
 */

import React, { useState, useMemo } from 'react';
import {
    Box,
    VStack,
    HStack,
    FormControl,
    FormLabel,
    FormErrorMessage,
    FormHelperText,
    Input,
    Textarea,
    Button,
    Card,
    CardBody,
    Text,
    useColorModeValue,
    Flex,
    Alert,
    AlertIcon,
    Divider,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send } from 'lucide-react';
import type { Schedule, AttendanceStatus } from '@/types';
import { useSubmitResponse } from '@/hooks/useApi';
import { formatDate, formatTime } from '@/lib/date';
import { useThemeStore, attendanceIcons } from '@/stores/themeStore';
import { storeEditToken } from '@/lib/tokenStorage';

// ============================================
// Types
// ============================================

interface ResponseFormProps {
    schedule: Schedule;
    editToken?: string;
    existingParticipant?: Schedule['participants'][0];
    onSuccess?: () => void;
    onCancel?: () => void;
}

interface CandidateInfo {
    id: number;
    start_at: string;
    end_at: string;
    note?: string;
}

// ============================================
// Sub-components for maintainability
// ============================================

const MotionBox = motion(Box);

/** AvailabilitySegmentedControl - Segmented button group for status selection */
function AvailabilitySegmentedControl({
    value,
    onChange,
    allowMaybe,
    mode,
}: {
    value: AttendanceStatus | undefined;
    onChange: (status: AttendanceStatus) => void;
    allowMaybe: boolean;
    mode: 'light' | 'dark' | 'cute';
}) {
    const icons = attendanceIcons[mode];
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const hoverBorderColor = useColorModeValue('gray.300', 'gray.500');

    const options: { value: AttendanceStatus; label: string; fullLabel: string; colorScheme: string }[] = [
        { value: 'ok', label: icons.ok, fullLabel: `${icons.ok} 参加可`, colorScheme: 'green' },
        { value: 'maybe', label: icons.maybe, fullLabel: `${icons.maybe} 要調整`, colorScheme: 'yellow' },
        { value: 'ng', label: icons.ng, fullLabel: `${icons.ng} 不可`, colorScheme: 'red' },
    ];

    const filteredOptions = allowMaybe ? options : options.filter((o) => o.value !== 'maybe');

    return (
        <HStack
            spacing={0}
            role="radiogroup"
            aria-label="回答を選択"
            bg="white"
            borderRadius="lg"
            border="1px solid"
            borderColor={borderColor}
            overflow="hidden"
            w={{ base: 'full', md: 'auto' }}
        >
            {filteredOptions.map((option, index) => {
                const isSelected = value === option.value;
                const colors = {
                    green: { bg: 'green.50', borderColor: 'green.400', color: 'green.700' },
                    yellow: { bg: 'yellow.50', borderColor: 'yellow.400', color: 'yellow.700' },
                    red: { bg: 'red.50', borderColor: 'red.400', color: 'red.700' },
                };
                const selectedColors = colors[option.colorScheme as keyof typeof colors];

                return (
                    <Button
                        key={option.value}
                        flex={1}
                        minW={{ base: 'auto', md: '92px' }}
                        h="44px"
                        borderRadius={0}
                        borderRight={index < filteredOptions.length - 1 ? '1px solid' : 'none'}
                        borderColor={borderColor}
                        bg={isSelected ? selectedColors.bg : 'white'}
                        color={isSelected ? selectedColors.color : 'gray.600'}
                        fontWeight={isSelected ? 'semibold' : 'normal'}
                        fontSize="sm"
                        onClick={() => onChange(option.value)}
                        role="radio"
                        aria-checked={isSelected}
                        _hover={{
                            bg: isSelected ? selectedColors.bg : 'gray.50',
                            borderColor: hoverBorderColor,
                        }}
                        _focusVisible={{
                            boxShadow: '0 0 0 3px rgba(66,153,225,0.35)',
                            zIndex: 1,
                            outline: 'none',
                        }}
                        transition="all 0.15s"
                    >
                        {option.fullLabel}
                    </Button>
                );
            })}
        </HStack>
    );
}

/** CandidateResponseRow - Single candidate date row with selection */
function CandidateResponseRow({
    candidate,
    value,
    onChange,
    error,
    allowMaybe,
    mode,
    index,
}: {
    candidate: CandidateInfo;
    value: AttendanceStatus | undefined;
    onChange: (status: AttendanceStatus) => void;
    error?: string;
    allowMaybe: boolean;
    mode: 'light' | 'dark' | 'cute';
    index: number;
}) {
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const hoverBorderColor = useColorModeValue('gray.300', 'gray.500');
    const errorBorderColor = useColorModeValue('red.300', 'red.500');

    return (
        <MotionBox
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: index * 0.03 }}
            w="full"
        >
            <Box
                p={3}
                borderRadius="lg"
                border="1px solid"
                borderColor={error ? errorBorderColor : borderColor}
                bg={useColorModeValue('gray.50', 'gray.700')}
                _hover={{ borderColor: error ? errorBorderColor : hoverBorderColor }}
                transition="border-color 0.15s"
            >
                <Flex
                    direction={{ base: 'column', md: 'row' }}
                    justify="space-between"
                    align={{ base: 'stretch', md: 'center' }}
                    gap={{ base: 3, md: 2 }}
                >
                    {/* Date/Time Info */}
                    <VStack align="start" spacing={0} flexShrink={0}>
                        <HStack spacing={2}>
                            <Text fontSize="md" fontWeight="bold" color="gray.800">
                                {formatDate(candidate.start_at, 'M/d')}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                                ({formatDate(candidate.start_at, 'E')})
                            </Text>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                            {formatTime(candidate.start_at)} - {formatTime(candidate.end_at)}
                        </Text>
                        {candidate.note && (
                            <Text fontSize="xs" color="gray.500" mt={1}>
                                {candidate.note}
                            </Text>
                        )}
                    </VStack>

                    {/* Status Selection */}
                    <AvailabilitySegmentedControl
                        value={value}
                        onChange={onChange}
                        allowMaybe={allowMaybe}
                        mode={mode}
                    />
                </Flex>

                {/* Error Message */}
                {error && (
                    <Text fontSize="sm" color="red.500" mt={2}>
                        {error}
                    </Text>
                )}
            </Box>
        </MotionBox>
    );
}

// ============================================
// Schema
// ============================================

const schema = z.object({
    name: z.string().min(1, 'お名前を入力してください'),
    comment: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// ============================================
// Main Component
// ============================================

export function ResponseForm({
    schedule,
    editToken,
    existingParticipant,
    onSuccess,
    onCancel,
}: ResponseFormProps) {
    // Initialize attendances from existing participant if editing
    const initialAttendances = useMemo(() => {
        const map = new Map<number, AttendanceStatus>();
        if (existingParticipant) {
            existingParticipant.attendances.forEach((a) => {
                map.set(a.candidate, a.status as AttendanceStatus);
            });
        }
        return map;
    }, [existingParticipant]);

    const [attendances, setAttendances] = useState<Map<number, AttendanceStatus>>(initialAttendances);
    const [candidateErrors, setCandidateErrors] = useState<Map<number, string>>(new Map());
    const [submitted, setSubmitted] = useState(false);
    
    const mode = useThemeStore((state: { mode: 'light' | 'dark' | 'cute' }) => state.mode);

    const { mutate: submitResponse, isPending } = useSubmitResponse(schedule.uuid);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: existingParticipant?.name || '',
            comment: existingParticipant?.comment || '',
        },
    });

    // Count unanswered candidates
    const unansweredCount = schedule.candidates.filter((c) => !attendances.has(c.id)).length;

    const setAttendance = (candidateId: number, status: AttendanceStatus) => {
        setAttendances((prev) => {
            const next = new Map(prev);
            next.set(candidateId, status);
            return next;
        });
        // Clear error for this candidate
        setCandidateErrors((prev) => {
            const next = new Map(prev);
            next.delete(candidateId);
            return next;
        });
    };

    const validateCandidates = (): boolean => {
        const newErrors = new Map<number, string>();
        let hasError = false;

        schedule.candidates.forEach((c) => {
            if (!attendances.has(c.id)) {
                newErrors.set(c.id, 'この候補日の回答を選択してください');
                hasError = true;
            }
        });

        setCandidateErrors(newErrors);
        return !hasError;
    };

    const onSubmit = (data: FormData) => {
        setSubmitted(true);

        // Validate candidates first
        if (!validateCandidates()) {
            return;
        }

        const attendanceList = Array.from(attendances.entries()).map(([candidate, status]) => ({
            candidate,
            status,
        }));

        submitResponse(
            {
                response: {
                    name: data.name,
                    comment: data.comment || '',
                    attendances: attendanceList,
                },
                editToken,
            },
            {
                onSuccess: (responseData) => {
                    // Store edit_token in localStorage for new submissions
                    if (!editToken && responseData?.edit_token) {
                        storeEditToken(
                            schedule.uuid,
                            responseData.id,
                            responseData.name,
                            responseData.edit_token
                        );
                    }
                    onSuccess?.();
                },
            }
        );
    };

    // Check if form is valid for submission
    const canSubmit = !isPending;

    return (
        <Card
            bg="white"
            shadow="sm"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="xl"
        >
            <CardBody p={{ base: 4, md: 5 }}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <VStack spacing={4} align="stretch">
                        {/* Section: Name */}
                        <Box>
                            <Text fontSize="sm" fontWeight="semibold" mb={0.5}>
                                お名前
                            </Text>
                            <Text fontSize="xs" color="gray.600" mb={2}>
                                回答者名として表示されます
                            </Text>
                            <FormControl isRequired isInvalid={!!errors.name}>
                                <Input
                                    {...register('name')}
                                    placeholder="例: 山田太郎"
                                    size="md"
                                    borderRadius="md"
                                    _focusVisible={{
                                        borderColor: 'blue.400',
                                        boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)',
                                    }}
                                />
                                <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
                            </FormControl>
                        </Box>

                        <Divider />

                        {/* Section: Candidate Responses */}
                        <Box>
                            <Text fontSize="sm" fontWeight="semibold" mb={0.5}>
                                各候補日の回答
                            </Text>
                            <Text fontSize="xs" color="gray.600" mb={3}>
                                すべての候補日について回答してください
                            </Text>

                            {submitted && unansweredCount > 0 && (
                                <Alert status="warning" borderRadius="md" mb={3} py={2}>
                                    <AlertIcon />
                                    <Text fontSize="sm">
                                        未選択の候補日が {unansweredCount} 件あります
                                    </Text>
                                </Alert>
                            )}

                            <VStack spacing={2}>
                                {schedule.candidates.map((candidate, index) => (
                                    <CandidateResponseRow
                                        key={candidate.id}
                                        candidate={candidate}
                                        value={attendances.get(candidate.id)}
                                        onChange={(status) => setAttendance(candidate.id, status)}
                                        error={candidateErrors.get(candidate.id)}
                                        allowMaybe={schedule.allow_maybe}
                                        mode={mode}
                                        index={index}
                                    />
                                ))}
                            </VStack>
                        </Box>

                        <Divider />

                        {/* Section: Comment */}
                        <Box>
                            <Text fontSize="sm" fontWeight="semibold" mb={0.5}>
                                コメント（任意）
                            </Text>
                            <Text fontSize="xs" color="gray.600" mb={2}>
                                連絡事項があればご記入ください
                            </Text>
                            <FormControl>
                                <Textarea
                                    {...register('comment')}
                                    placeholder="連絡事項があれば記入"
                                    size="md"
                                    minH="80px"
                                    borderRadius="md"
                                    _focusVisible={{
                                        borderColor: 'blue.400',
                                        boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)',
                                    }}
                                />
                            </FormControl>
                        </Box>

                        <VStack spacing={2} pt={1}>
                            <Button
                                type="submit"
                                size="md"
                                h="44px"
                                w="full"
                                colorScheme="brand"
                                leftIcon={<Send size={18} />}
                                isLoading={isPending}
                                isDisabled={!canSubmit}
                                loadingText={existingParticipant ? '更新中...' : '送信中...'}
                                borderRadius="md"
                                _focusVisible={{
                                    boxShadow: '0 0 0 3px rgba(66,153,225,0.35)',
                                }}
                            >
                                {existingParticipant ? '回答を更新する' : '回答を送信する'}
                            </Button>

                            {onCancel && (
                                <Button
                                    variant="ghost"
                                    size="md"
                                    h="40px"
                                    w="full"
                                    onClick={onCancel}
                                    borderRadius="md"
                                    color="gray.600"
                                >
                                    キャンセル
                                </Button>
                            )}
                        </VStack>
                    </VStack>
                </form>
            </CardBody>
        </Card>
    );
}
