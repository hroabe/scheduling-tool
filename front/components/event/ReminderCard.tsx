'use client';

/**
 * ReminderCard - organizer nudge on the responses tab:
 * share the link to collect (more) responses, with a deadline reminder when one is set.
 */

import { Box, Button, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react';
import { Bell, Share2 } from 'lucide-react';
import { formatDateTime } from '@/lib/date';
import { useI18n } from '@/providers/I18nProvider';

interface ReminderCardProps {
    responseCount: number;
    deadline?: string | null;
    onShare: () => void;
    /** Injected for tests; defaults to the current time */
    now?: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function ReminderCard({ responseCount, deadline, onShare, now }: ReminderCardProps) {
    const { t } = useI18n();
    const current = (now ?? new Date()).getTime();
    const deadlineTime = deadline ? new Date(deadline).getTime() : null;
    const upcoming = deadlineTime !== null && deadlineTime > current;
    const soon = upcoming && deadlineTime - current < DAY_MS;

    return (
        <Box
            as="section"
            aria-labelledby="reminder-heading"
            bg={soon ? 'orange.50' : 'brand.subtle'}
            _dark={soon ? { bg: 'rgba(237, 137, 54, 0.16)' } : undefined}
            borderRadius="xl"
            border="1px solid"
            borderColor={soon ? 'orange.300' : 'border.default'}
            p={{ base: 4, md: 5 }}
            className="no-print"
            data-testid="reminder-card"
        >
            <VStack spacing={3} align="start">
                <HStack spacing={2}>
                    <Icon as={Bell} aria-hidden />
                    <Heading as="h2" size="sm" id="reminder-heading">
                        {responseCount === 0 ? t('event.reminder.titleEmpty') : t('event.reminder.title')}
                    </Heading>
                </HStack>
                <Text fontSize="sm">
                    {responseCount === 0
                        ? t('event.reminder.bodyEmpty')
                        : t('event.reminder.body', { count: responseCount })}
                </Text>
                {upcoming && deadline && (
                    <Text fontSize="sm" fontWeight={soon ? 'semibold' : 'normal'} data-testid="reminder-deadline">
                        {soon
                            ? t('event.reminder.deadlineSoon', { date: formatDateTime(deadline) })
                            : t('event.reminder.deadline', { date: formatDateTime(deadline) })}
                    </Text>
                )}
                <Button size="sm" leftIcon={<Share2 size={14} />} onClick={onShare}>
                    {t('event.reminder.share')}
                </Button>
            </VStack>
        </Box>
    );
}
