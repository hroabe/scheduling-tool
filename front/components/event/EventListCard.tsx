'use client';

/**
 * EventListCard - card for the "My events" list
 * Shows the event name, status, candidate/response counts, deadline and an "Open" button.
 */

import { Box, Button, Flex, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react';
import NextLink from 'next/link';
import { CalendarDays, Clock, Users } from 'lucide-react';
import { StatusPill, getEventStatus } from './StatusPill';
import { formatDate, formatDateTime } from '@/lib/date';
import { useI18n } from '@/providers/I18nProvider';
import type { ScheduleListItem } from '@/types';

interface EventListCardProps {
    schedule: ScheduleListItem;
}

export function EventListCard({ schedule }: EventListCardProps) {
    const { t } = useI18n();
    const status = getEventStatus(schedule);

    return (
        <Box
            bg="bg.card"
            borderRadius="xl"
            border="1px solid"
            borderColor="border.default"
            p={{ base: 4, md: 5 }}
            boxShadow="sm"
            transition="box-shadow 0.2s, transform 0.2s"
            _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
            h="full"
        >
            <VStack align="stretch" spacing={4} h="full">
                <Flex justify="space-between" align="start" gap={2}>
                    <Heading as="h3" size="sm" noOfLines={2} flex="1" wordBreak="break-word">
                        {schedule.name}
                    </Heading>
                    <StatusPill status={status} flexShrink={0} />
                </Flex>

                <HStack spacing={4} fontSize="sm" color="text.muted" flexWrap="wrap">
                    <HStack spacing={1}>
                        <Icon as={CalendarDays} aria-hidden />
                        <Text>{t('schedule.card.candidates', { count: schedule.candidate_count })}</Text>
                    </HStack>
                    <HStack spacing={1}>
                        <Icon as={Users} aria-hidden />
                        <Text>{t('schedule.card.responses', { count: schedule.participant_count })}</Text>
                    </HStack>
                </HStack>

                {schedule.deadline && (
                    <HStack spacing={1} fontSize="sm" color="text.muted">
                        <Icon as={Clock} aria-hidden />
                        <Text>{t('schedule.card.deadline', { date: formatDateTime(schedule.deadline) })}</Text>
                    </HStack>
                )}

                <Text fontSize="xs" color="text.muted" mt="auto">
                    {t('schedule.card.created', { date: formatDate(schedule.created_at) })}
                </Text>

                <Button as={NextLink} href={`/event/${schedule.uuid}`} size="sm" w="100%">
                    {t('schedule.card.open')}
                </Button>
            </VStack>
        </Box>
    );
}
