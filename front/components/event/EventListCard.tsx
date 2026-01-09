'use client';

/**
 * EventListCard - Card for event listing on My Events page
 * Displays: event name, status, meta, progress bar, and "開く" button
 */

import {
    Box,
    Flex,
    Heading,
    Text,
    HStack,
    VStack,
    Button,
    useColorModeValue,
} from '@chakra-ui/react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { StatusPill, getEventStatus } from './StatusPill';
import { ProgressBarRect } from './ProgressBarRect';
import type { ScheduleListItem } from '@/types';

interface EventListCardProps {
    schedule: ScheduleListItem;
}

export function EventListCard({ schedule }: EventListCardProps) {
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.300', 'gray.600');
    const metaColor = useColorModeValue('gray.600', 'gray.400');

    const status = getEventStatus({
        is_finalized: schedule.is_finalized,
        is_active: schedule.is_active,
        is_expired: false, // ScheduleListItem doesn't have this field
    });

    // Calculate progress (example: based on participant count relative to a target)
    // For now, use a simple percentage based on participant count
    const progressValue = Math.min(schedule.participant_count * 20, 100);

    return (
        <Box
            bg={cardBg}
            borderRadius="xl"
            border="1px solid"
            borderColor={borderColor}
            p={{ base: 4, md: 5 }}
            boxShadow="sm"
            transition="all 0.2s"
            _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
        >
            <VStack align="stretch" spacing={4}>
                {/* Header: Name + Status */}
                <Flex justify="space-between" align="start" gap={2}>
                    <Heading size="sm" noOfLines={2} flex="1">
                        {schedule.name}
                    </Heading>
                    <StatusPill status={status} flexShrink={0} />
                </Flex>

                {/* Meta info */}
                <HStack spacing={4} fontSize="sm" color={metaColor}>
                    <Text>候補: {schedule.candidate_count}</Text>
                    <Text>回答: {schedule.participant_count}人</Text>
                </HStack>

                {/* Deadline if exists */}
                {schedule.deadline && (
                    <Text fontSize="sm" color={metaColor}>
                        期限: {format(new Date(schedule.deadline), 'yyyy/MM/dd HH:mm', { locale: ja })}
                    </Text>
                )}

                {/* Progress */}
                <VStack align="stretch" spacing={1}>
                    <Text fontSize="xs" color={metaColor}>
                        回答進捗
                    </Text>
                    <ProgressBarRect value={progressValue} />
                </VStack>

                {/* Created date */}
                <Text fontSize="xs" color={useColorModeValue('gray.400', 'gray.500')}>
                    作成: {format(new Date(schedule.created_at), 'yyyy/MM/dd', { locale: ja })}
                </Text>

                {/* Action button - constrained within card */}
                <Button
                    as={Link}
                    href={`/event/${schedule.uuid}`}
                    colorScheme="brand"
                    size="sm"
                    w="100%"
                >
                    開く
                </Button>
            </VStack>
        </Box>
    );
}
