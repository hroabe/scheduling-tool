'use client';

import { useState } from 'react';
import {
    Box,
    VStack,
    HStack,
    FormControl,
    FormLabel,
    FormErrorMessage,
    Input,
    Textarea,
    Button,
    Card,
    CardBody,
    Text,
    useColorModeValue,
    SimpleGrid,
    Flex,
    Icon,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Circle, Triangle, X } from 'lucide-react';
import type { Schedule, AttendanceStatus } from '@/types';
import { useSubmitResponse } from '@/hooks/useApi';
import { formatDate, formatTime } from '@/lib/date';

interface ResponseFormProps {
    schedule: Schedule;
    editToken?: string;
    onSuccess?: () => void;
}

const MotionBox = motion(Box);

const schema = z.object({
    name: z.string().min(1, 'お名前を入力してください'),
    comment: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const statusOptions: { value: AttendanceStatus; label: string; icon: typeof Circle; color: string }[] = [
    { value: 'ok', label: '◯', icon: Circle, color: 'green' },
    { value: 'maybe', label: '△', icon: Triangle, color: 'yellow' },
    { value: 'ng', label: '×', icon: X, color: 'red' },
];

export function ResponseForm({ schedule, editToken, onSuccess }: ResponseFormProps) {
    const [attendances, setAttendances] = useState<Map<number, AttendanceStatus>>(new Map());
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const candidateBg = useColorModeValue('gray.50', 'gray.700');

    const { mutate: submitResponse, isPending } = useSubmitResponse(schedule.uuid);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const setAttendance = (candidateId: number, status: AttendanceStatus) => {
        setAttendances((prev) => {
            const next = new Map(prev);
            next.set(candidateId, status);
            return next;
        });
    };

    const onSubmit = (data: FormData) => {
        const attendanceList = Array.from(attendances.entries()).map(([candidate, status]) => ({
            candidate,
            status,
        }));

        // Validate that all candidates have a response
        if (attendanceList.length !== schedule.candidates.length) {
            // Fill in missing as pending or show error
            schedule.candidates.forEach((c) => {
                if (!attendances.has(c.id)) {
                    attendanceList.push({ candidate: c.id, status: 'pending' });
                }
            });
        }

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
                onSuccess: () => {
                    onSuccess?.();
                },
            }
        );
    };

    const filteredOptions = schedule.allow_maybe
        ? statusOptions
        : statusOptions.filter((o) => o.value !== 'maybe');

    return (
        <Card bg={cardBg} shadow="sm">
            <CardBody>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <VStack spacing={6} align="stretch">
                        {/* Name Input */}
                        <FormControl isRequired isInvalid={!!errors.name}>
                            <FormLabel>お名前</FormLabel>
                            <Input
                                {...register('name')}
                                placeholder="例：山田太郎"
                                size="lg"
                            />
                            <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
                        </FormControl>

                        {/* Attendance Selection */}
                        <Box>
                            <Text fontWeight="medium" mb={4}>
                                各候補日の出欠を選択してください
                            </Text>

                            <VStack spacing={3}>
                                {schedule.candidates.map((candidate, index) => (
                                    <MotionBox
                                        key={candidate.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: index * 0.05 }}
                                        w="full"
                                    >
                                        <Box
                                            p={4}
                                            borderRadius="lg"
                                            border="1px solid"
                                            borderColor={borderColor}
                                            bg={candidateBg}
                                        >
                                            <Flex
                                                direction={{ base: 'column', md: 'row' }}
                                                justify="space-between"
                                                align={{ base: 'stretch', md: 'center' }}
                                                gap={4}
                                            >
                                                {/* Date/Time Info */}
                                                <VStack align="start" spacing={0}>
                                                    <HStack>
                                                        <Text fontWeight="bold">
                                                            {formatDate(candidate.start_at, 'M月d日')}
                                                        </Text>
                                                        <Text color="gray.500">
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

                                                {/* Status Buttons */}
                                                <HStack spacing={2}>
                                                    {filteredOptions.map((option) => {
                                                        const isSelected = attendances.get(candidate.id) === option.value;
                                                        return (
                                                            <Button
                                                                key={option.value}
                                                                size="lg"
                                                                variant={isSelected ? 'solid' : 'outline'}
                                                                colorScheme={isSelected ? option.color : 'gray'}
                                                                onClick={() => setAttendance(candidate.id, option.value)}
                                                                minW="60px"
                                                                fontSize="xl"
                                                                _hover={{
                                                                    transform: 'scale(1.05)',
                                                                }}
                                                                transition="all 0.2s"
                                                            >
                                                                {option.label}
                                                            </Button>
                                                        );
                                                    })}
                                                </HStack>
                                            </Flex>
                                        </Box>
                                    </MotionBox>
                                ))}
                            </VStack>
                        </Box>

                        {/* Comment */}
                        <FormControl>
                            <FormLabel>コメント（任意）</FormLabel>
                            <Textarea
                                {...register('comment')}
                                placeholder="その他連絡事項があればご記入ください"
                                rows={3}
                            />
                        </FormControl>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            size="lg"
                            colorScheme="brand"
                            leftIcon={<Send size={18} />}
                            isLoading={isPending}
                            loadingText="送信中..."
                        >
                            回答を送信する
                        </Button>
                    </VStack>
                </form>
            </CardBody>
        </Card>
    );
}
