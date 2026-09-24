'use client';

/** /account/events: events created while signed in (GET /accounts/me/schedules/) */

import { useState } from 'react';
import {
    Alert,
    AlertIcon,
    Button,
    Card,
    CardBody,
    Container,
    Flex,
    Heading,
    HStack,
    LinkBox,
    LinkOverlay,
    Text,
    VStack,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { getEventStatus, StatusPill } from '@/components/event/StatusPill';
import { useMySchedules } from '@/hooks/useApi';
import { formatDate, formatDateTime } from '@/lib/date';
import { useI18n } from '@/providers/I18nProvider';
import type { ScheduleListItem } from '@/types';
import { AccountNav } from './AccountNav';
import { CenteredSpinner } from './CenteredSpinner';
import { RequireAuth } from './RequireAuth';
import { apiErrorMessage } from './utils';

/** Matches REST_FRAMEWORK.PAGE_SIZE on the API */
const PAGE_SIZE = 20;

export function MyEventsList() {
    const { t } = useI18n();
    return (
        <Container maxW="container.md" py={{ base: 6, md: 10 }} px={4}>
            <VStack spacing={6} align="stretch">
                <Flex justify="space-between" align="center" gap={4} wrap="wrap">
                    <Heading as="h1" size="lg">
                        {t('account.events.title')}
                    </Heading>
                    <Button as={NextLink} href="/create" size="sm" leftIcon={<CalendarPlus size={16} aria-hidden />}>
                        {t('account.events.create')}
                    </Button>
                </Flex>
                <AccountNav />
                <RequireAuth>{() => <EventsPager />}</RequireAuth>
            </VStack>
        </Container>
    );
}

function EventsPager() {
    const { t } = useI18n();
    const [page, setPage] = useState(1);
    const { data, error, isPending, isFetching, refetch } = useMySchedules(page);

    if (isPending) return <CenteredSpinner />;
    if (error || !data) {
        return (
            <Alert status="error" borderRadius="md" justifyContent="space-between" flexWrap="wrap" gap={2}>
                <HStack>
                    <AlertIcon />
                    <Text>{t('account.events.loadError', { reason: apiErrorMessage(error, t) })}</Text>
                </HStack>
                <Button size="sm" variant="outline" onClick={() => refetch()}>
                    {t('account.events.retry')}
                </Button>
            </Alert>
        );
    }

    if (data.count === 0) {
        return (
            <Card>
                <CardBody>
                    <VStack spacing={4} py={8} textAlign="center" data-testid="events-empty">
                        <CalendarPlus size={40} aria-hidden />
                        <Heading as="h2" size="md">
                            {t('account.events.empty')}
                        </Heading>
                        <Text color="text.muted">{t('account.events.emptyDescription')}</Text>
                        <Button as={NextLink} href="/create">
                            {t('account.events.create')}
                        </Button>
                    </VStack>
                </CardBody>
            </Card>
        );
    }

    const totalPages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));

    return (
        <VStack spacing={4} align="stretch" aria-busy={isFetching}>
            <Text color="text.muted" fontSize="sm">
                {t('account.events.total', { count: data.count })}
            </Text>
            <VStack as="ul" spacing={3} align="stretch" listStyleType="none" m={0}>
                {data.results.map((schedule) => (
                    <EventItem key={schedule.uuid} schedule={schedule} />
                ))}
            </VStack>
            {totalPages > 1 && (
                <HStack as="nav" aria-label={t('account.events.pagination')} justify="center" spacing={4}>
                    <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<ChevronLeft size={16} aria-hidden />}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        isDisabled={!data.previous || isFetching}
                    >
                        {t('account.events.prev')}
                    </Button>
                    <Text fontSize="sm" aria-live="polite">
                        {t('account.events.page', { page, total: totalPages })}
                    </Text>
                    <Button
                        size="sm"
                        variant="outline"
                        rightIcon={<ChevronRight size={16} aria-hidden />}
                        onClick={() => setPage((p) => p + 1)}
                        isDisabled={!data.next || isFetching}
                    >
                        {t('account.events.next')}
                    </Button>
                </HStack>
            )}
        </VStack>
    );
}

/** API status (open | closed | fixed; closed includes passed deadlines), with paused open events shown as inactive */
export function listItemStatus(schedule: Pick<ScheduleListItem, 'status' | 'is_active' | 'is_finalized'>) {
    const status = schedule.status ?? getEventStatus(schedule);
    return status === 'open' && !schedule.is_active ? 'inactive' : status;
}

function EventItem({ schedule }: { schedule: ScheduleListItem }) {
    const { t } = useI18n();
    return (
        <LinkBox as="li" data-testid="event-item">
            <Card _hover={{ borderColor: 'brand.fg' }} transition="border-color 0.15s">
                <CardBody py={4}>
                    <Flex justify="space-between" align="flex-start" gap={3}>
                        <VStack align="stretch" spacing={1} minW={0}>
                            <LinkOverlay as={NextLink} href={`/event/${schedule.uuid}`}>
                                <Heading as="h2" size="sm" noOfLines={2}>
                                    {schedule.name}
                                </Heading>
                            </LinkOverlay>
                            <HStack spacing={3} color="text.muted" fontSize="sm" wrap="wrap">
                                <Text>{t('account.events.participants', { count: schedule.participant_count })}</Text>
                                <Text>{t('account.events.candidates', { count: schedule.candidate_count })}</Text>
                                {schedule.deadline && (
                                    <Text>{t('account.events.deadline', { date: formatDateTime(schedule.deadline) })}</Text>
                                )}
                                <Text>{t('account.events.created', { date: formatDate(schedule.created_at) })}</Text>
                            </HStack>
                        </VStack>
                        <StatusPill status={listItemStatus(schedule)} flexShrink={0} />
                    </Flex>
                </CardBody>
            </Card>
        </LinkBox>
    );
}
