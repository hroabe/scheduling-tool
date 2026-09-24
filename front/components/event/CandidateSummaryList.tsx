'use client';

/**
 * CandidateSummaryList - selectable list of candidates with a "yes" progress bar
 */

import { Badge, Box, HStack, Text, VStack } from '@chakra-ui/react';
import { ProgressBarRect } from './ProgressBarRect';
import { useAvailabilitySymbols } from '@/lib/availabilitySymbols';
import { formatDate, formatTime } from '@/lib/date';
import { useI18n } from '@/providers/I18nProvider';
import type { CandidateSummary } from '@/types';

interface CandidateSummaryListProps {
    candidates: CandidateSummary[];
    recommendedId?: number | null;
    finalizedId?: number | null;
    selectedId?: number;
    onSelect: (id: number) => void;
    totalParticipants: number;
}

export function CandidateSummaryList({
    candidates,
    recommendedId,
    finalizedId,
    selectedId,
    onSelect,
    totalParticipants,
}: CandidateSummaryListProps) {
    const { t } = useI18n();
    const symbols = useAvailabilitySymbols();

    return (
        <VStack as="ul" spacing={2} align="stretch" listStyleType="none" aria-label={t('event.summary.listLabel')}>
            {candidates.map((candidate) => {
                const isSelected = candidate.candidate_id === selectedId;
                const isRecommended = candidate.candidate_id === recommendedId;
                const isFinalized = candidate.candidate_id === finalizedId;
                const dateLabel = formatDate(candidate.start_at, t('event.format.dayShort'));

                return (
                    <Box as="li" key={candidate.candidate_id} data-testid="summary-candidate">
                        <Box
                            as="button"
                            type="button"
                            w="full"
                            textAlign="left"
                            p={3}
                            borderRadius="lg"
                            border="2px solid"
                            borderColor={isSelected ? 'brand.fg' : 'border.default'}
                            bg={isSelected ? 'brand.subtle' : 'transparent'}
                            transition="background 0.2s, border-color 0.2s"
                            _hover={{ bg: isSelected ? 'brand.subtle' : 'bg.subtle' }}
                            _focusVisible={{ boxShadow: 'outline', outline: 'none' }}
                            aria-pressed={isSelected}
                            onClick={() => onSelect(candidate.candidate_id)}
                        >
                            <HStack justify="space-between" mb={2} align="start" spacing={2}>
                                <Box>
                                    <Text fontWeight="semibold" fontSize="sm">
                                        {dateLabel}
                                    </Text>
                                    <Text fontSize="xs" color="text.muted">
                                        {formatTime(candidate.start_at)} - {formatTime(candidate.end_at)}
                                    </Text>
                                </Box>
                                <HStack spacing={1} flexWrap="wrap" justify="end">
                                    {isFinalized && (
                                        <Badge colorScheme="green" variant="solid" fontSize="2xs">
                                            {t('event.summary.finalized')}
                                        </Badge>
                                    )}
                                    {isRecommended && !isFinalized && (
                                        <Badge colorScheme="green" fontSize="2xs">
                                            {t('event.summary.recommended')}
                                        </Badge>
                                    )}
                                    <Badge
                                        colorScheme="green"
                                        variant="subtle"
                                        aria-label={t('response.table.countLabel', {
                                            status: t('response.status.ok'),
                                            count: candidate.ok_count,
                                        })}
                                    >
                                        {symbols.yes}
                                        {candidate.ok_count}
                                    </Badge>
                                </HStack>
                            </HStack>
                            <ProgressBarRect value={candidate.ok_count} max={totalParticipants || 1} fillColor="green.400" />
                        </Box>
                    </Box>
                );
            })}
        </VStack>
    );
}
