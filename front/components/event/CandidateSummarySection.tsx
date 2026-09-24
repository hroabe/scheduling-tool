'use client';

/**
 * CandidateSummarySection - "compare → recommendation → decide" block of the summary tab.
 * Left: candidates sorted by score. Right: details of the selected candidate with the
 * reasons for the recommendation and (organizers only) the finalize CTA.
 */

import { useState } from 'react';
import { Box, Card, CardBody, Flex, Heading, Text, VStack } from '@chakra-ui/react';
import { CandidateDetailCard } from './CandidateDetailCard';
import { CandidateSummaryList } from './CandidateSummaryList';
import { useAvailabilitySymbols } from '@/lib/availabilitySymbols';
import { useI18n } from '@/providers/I18nProvider';
import type { CandidateSummary, Schedule, ScheduleSummary } from '@/types';

interface CandidateSummarySectionProps {
    schedule: Schedule;
    summary: ScheduleSummary;
    icsUrl?: (candidateId: number) => string;
    /** Organizer (owner or verified edit key) */
    isOrganizer?: boolean;
    onFinalize?: (candidateId: number) => void;
}

/** Score desc, then earlier date first */
export function sortCandidates(candidates: CandidateSummary[]): CandidateSummary[] {
    return [...candidates].sort(
        (a, b) => b.score - a.score || new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );
}

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** Human-readable reasons why a candidate is recommended */
export function recommendationReasons(
    candidate: CandidateSummary,
    all: CandidateSummary[],
    totalParticipants: number,
    t: Translate,
    symbols: { yes: string; no: string }
): string[] {
    if (totalParticipants === 0) return [];
    const reasons: string[] = [];
    const maxOk = Math.max(...all.map((c) => c.ok_count));
    const minNg = Math.min(...all.map((c) => c.ng_count));
    const maxScore = Math.max(...all.map((c) => c.score));

    if (candidate.ok_count === totalParticipants) {
        reasons.push(t('event.summary.reason.allOk'));
    } else if (candidate.ok_count === maxOk && candidate.ok_count > 0) {
        reasons.push(t('event.summary.reason.mostOk', { symbol: symbols.yes, count: candidate.ok_count }));
    }
    if (candidate.ng_count === 0) {
        reasons.push(t('event.summary.reason.noNg', { symbol: symbols.no }));
    } else if (candidate.ng_count === minNg) {
        reasons.push(t('event.summary.reason.fewestNg', { symbol: symbols.no, count: candidate.ng_count }));
    }
    if (candidate.score === maxScore) {
        const tied = all.filter((c) => c.score === maxScore).length;
        reasons.push(tied > 1 ? t('event.summary.reason.earliestTie') : t('event.summary.reason.topScore'));
    }
    return reasons;
}

export function CandidateSummarySection({ schedule, summary, icsUrl, isOrganizer = false, onFinalize }: CandidateSummarySectionProps) {
    const { t } = useI18n();
    const symbols = useAvailabilitySymbols();
    const sorted = sortCandidates(summary.candidates);
    const recommendedId = summary.recommended_candidate?.candidate_id ?? null;
    const finalizedId = schedule.is_finalized ? schedule.finalized_candidate : null;

    const [selectedId, setSelectedId] = useState<number | undefined>(
        () => finalizedId ?? recommendedId ?? sorted[0]?.candidate_id
    );

    if (sorted.length === 0) return null;
    const selected = sorted.find((c) => c.candidate_id === selectedId) ?? sorted[0];
    const isRecommended = selected.candidate_id === recommendedId;

    return (
        <Card as="section" aria-labelledby="candidate-summary-heading">
            <CardBody>
                <VStack spacing={4} align="stretch">
                    <Box>
                        <Heading as="h2" size="sm" id="candidate-summary-heading">
                            {t('event.summary.title')}
                        </Heading>
                        <Text fontSize="xs" color="text.muted" mt={1}>
                            {t('event.summary.scoreHelp', { yes: symbols.yes, maybe: symbols.maybe })}
                        </Text>
                    </Box>

                    <Flex direction={{ base: 'column', lg: 'row' }} gap={4} align={{ base: 'stretch', lg: 'flex-start' }}>
                        <Box flex={1} minW={0}>
                            <CandidateSummaryList
                                candidates={sorted}
                                recommendedId={recommendedId}
                                finalizedId={finalizedId}
                                selectedId={selected.candidate_id}
                                onSelect={setSelectedId}
                                totalParticipants={summary.total_participants}
                            />
                        </Box>
                        <Box flex={1} minW={0} maxW={{ base: 'full', lg: '380px' }} position={{ lg: 'sticky' }} top={{ lg: 4 }}>
                            <CandidateDetailCard
                                candidate={selected}
                                isRecommended={isRecommended}
                                reasons={
                                    isRecommended
                                        ? recommendationReasons(selected, sorted, summary.total_participants, t, symbols)
                                        : []
                                }
                                totalParticipants={summary.total_participants}
                                allowMaybe={schedule.allow_maybe}
                                canFinalize={isOrganizer && !schedule.is_finalized}
                                isFinalizedCandidate={selected.candidate_id === finalizedId}
                                onFinalize={onFinalize}
                                icsUrl={icsUrl?.(selected.candidate_id)}
                            />
                        </Box>
                    </Flex>
                </VStack>
            </CardBody>
        </Card>
    );
}
