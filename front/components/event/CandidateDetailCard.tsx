'use client';

/**
 * CandidateDetailCard - details of the selected candidate: date, recommendation reasons,
 * yes/maybe/no breakdown, calendar export and (organizers only) the "finalize" CTA.
 */

import { Badge, Box, Button, Flex, HStack, List, ListIcon, ListItem, Text, VStack } from '@chakra-ui/react';
import { CalendarCheck, CalendarPlus, Check, Sparkles } from 'lucide-react';
import { useAvailabilitySymbols } from '@/lib/availabilitySymbols';
import { formatDate, formatTime } from '@/lib/date';
import { useI18n } from '@/providers/I18nProvider';
import type { CandidateSummary } from '@/types';

interface CandidateDetailCardProps {
    candidate: CandidateSummary;
    isRecommended: boolean;
    /** Why this candidate is recommended (only shown when recommended) */
    reasons?: string[];
    totalParticipants: number;
    allowMaybe?: boolean;
    /** Whether the viewer may finalize (organizer and event not yet finalized) */
    canFinalize?: boolean;
    /** This candidate is the finalized date */
    isFinalizedCandidate?: boolean;
    onFinalize?: (candidateId: number) => void;
    icsUrl?: string;
}

export function CandidateDetailCard({
    candidate,
    isRecommended,
    reasons = [],
    totalParticipants,
    allowMaybe = true,
    canFinalize = false,
    isFinalizedCandidate = false,
    onFinalize,
    icsUrl,
}: CandidateDetailCardProps) {
    const { t } = useI18n();
    const symbols = useAvailabilitySymbols();

    const answered = candidate.ok_count + candidate.maybe_count + candidate.ng_count;
    const pct = (n: number) => (answered > 0 ? (n / answered) * 100 : 0);
    const breakdown = [
        { key: 'ok', symbol: symbols.yes, count: candidate.ok_count, color: 'green' },
        ...(allowMaybe || candidate.maybe_count > 0
            ? [{ key: 'maybe', symbol: symbols.maybe, count: candidate.maybe_count, color: 'yellow' }]
            : []),
        { key: 'ng', symbol: symbols.no, count: candidate.ng_count, color: 'red' },
    ];

    return (
        <Box
            p={4}
            borderRadius="xl"
            border="2px solid"
            borderColor={isFinalizedCandidate || isRecommended ? 'green.400' : 'border.default'}
            bg="bg.card"
            data-testid="candidate-detail"
        >
            <VStack spacing={4} align="stretch">
                <Flex justify="space-between" align="flex-start" gap={2}>
                    <Box>
                        <Text fontSize="xl" fontWeight="bold">
                            {formatDate(candidate.start_at, t('event.format.dayLong'))}
                        </Text>
                        <Text fontSize="sm" color="text.muted">
                            {formatTime(candidate.start_at)} - {formatTime(candidate.end_at)}
                            {candidate.note ? ` ・ ${candidate.note}` : ''}
                        </Text>
                    </Box>
                    <VStack align="end" spacing={1}>
                        {isFinalizedCandidate ? (
                            <Badge colorScheme="green" variant="solid" px={2} py={1}>
                                {t('event.summary.finalized')}
                            </Badge>
                        ) : (
                            isRecommended && (
                                <Badge colorScheme="green" px={2} py={1}>
                                    {t('event.summary.recommended')}
                                </Badge>
                            )
                        )}
                        <Text fontSize="sm" color="text.muted">
                            {t('event.summary.answered', { count: answered, total: totalParticipants })}
                        </Text>
                    </VStack>
                </Flex>

                <HStack
                    h="12px"
                    borderRadius="2px"
                    overflow="hidden"
                    bg="border.default"
                    spacing={0}
                    role="img"
                    aria-label={breakdown
                        .map((item) => t('response.table.countLabel', { status: t(`response.status.${item.key}`), count: item.count }))
                        .join(', ')}
                >
                    {breakdown.map((item) => (
                        <Box key={item.key} h="full" w={`${pct(item.count)}%`} bg={`${item.color}.400`} transition="width 0.3s" />
                    ))}
                </HStack>

                <HStack justify="center" spacing={3} flexWrap="wrap">
                    {breakdown.map((item) => (
                        <Badge
                            key={item.key}
                            colorScheme={item.color}
                            variant="subtle"
                            px={3}
                            py={1}
                            borderRadius="full"
                            fontSize="sm"
                            aria-label={t('response.table.countLabel', { status: t(`response.status.${item.key}`), count: item.count })}
                        >
                            {item.symbol} {item.count}
                        </Badge>
                    ))}
                </HStack>

                {isRecommended && reasons.length > 0 && (
                    <Box bg="bg.subtle" borderRadius="lg" p={3} data-testid="recommend-reasons">
                        <Text fontSize="sm" fontWeight="semibold" mb={1}>
                            {t('event.summary.reasonsTitle')}
                        </Text>
                        <List spacing={1} fontSize="sm" color="text.muted">
                            {reasons.map((reason) => (
                                <ListItem key={reason} display="flex" alignItems="center">
                                    <ListIcon as={Sparkles} color="green.400" />
                                    {reason}
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}

                <VStack spacing={2} align="stretch">
                    {canFinalize && onFinalize && !isFinalizedCandidate && (
                        <Button leftIcon={<Check size={18} />} onClick={() => onFinalize(candidate.candidate_id)} w="full">
                            {t('event.summary.finalizeCta')}
                        </Button>
                    )}
                    {icsUrl && (
                        <Button
                            as="a"
                            href={icsUrl}
                            size="sm"
                            variant="ghost"
                            leftIcon={isFinalizedCandidate ? <CalendarCheck size={14} /> : <CalendarPlus size={14} />}
                        >
                            {t('event.summary.addToCalendar')}
                        </Button>
                    )}
                </VStack>
            </VStack>
        </Box>
    );
}
