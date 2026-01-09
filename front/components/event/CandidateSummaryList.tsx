'use client';

import {
    Box,
    VStack,
    HStack,
    Text,
    Badge,
    useColorModeValue,
} from '@chakra-ui/react';
import type { CandidateSummary } from '@/types';
import { formatDate, formatTime } from '@/lib/date';
import { ProgressBarRect } from './ProgressBarRect';
import { useI18n } from '@/providers/I18nProvider';
import { getAvailabilitySymbols } from '@/lib/availabilitySymbols';

interface CandidateSummaryListProps {
    candidates: CandidateSummary[];
    recommendedId?: number;
    selectedId?: number;
    onSelect: (id: number) => void;
    totalParticipants: number;
}

export function CandidateSummaryList({
    candidates,
    recommendedId,
    selectedId,
    onSelect,
    totalParticipants,
}: CandidateSummaryListProps) {
    const { locale } = useI18n();
    const symbols = getAvailabilitySymbols(locale);
    const borderColor = useColorModeValue('gray.300', 'gray.600');
    const hoverBg = useColorModeValue('gray.50', 'gray.700');
    const selectedBg = useColorModeValue('blue.50', 'blue.900');
    const selectedBorder = useColorModeValue('blue.400', 'blue.500');

    return (
        <VStack spacing={2} align="stretch">
            {candidates.map((candidate) => {
                const isSelected = candidate.candidate_id === selectedId;
                const isRecommended = candidate.candidate_id === recommendedId;
                const progressPercent = totalParticipants > 0
                    ? (candidate.ok_count / totalParticipants) * 100
                    : 0;

                return (
                    <Box
                        key={candidate.candidate_id}
                        p={3}
                        borderRadius="lg"
                        border="2px solid"
                        borderColor={isSelected ? selectedBorder : borderColor}
                        bg={isSelected ? selectedBg : 'transparent'}
                        cursor="pointer"
                        transition="all 0.2s"
                        _hover={{ bg: isSelected ? selectedBg : hoverBg }}
                        onClick={() => onSelect(candidate.candidate_id)}
                    >
                        <HStack justify="space-between" mb={2}>
                            <HStack spacing={2}>
                                <Text fontWeight="medium" fontSize="sm">
                                    {formatDate(candidate.start_at, 'M/d')}（{formatDate(candidate.start_at, 'E')}）
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                    {formatTime(candidate.start_at)} - {formatTime(candidate.end_at)}
                                </Text>
                            </HStack>
                            <HStack spacing={1}>
                                {isRecommended && (
                                    <Badge colorScheme="green" fontSize="2xs" px={1}>
                                        おすすめ
                                    </Badge>
                                )}
                                <Badge colorScheme="green" variant="subtle" px={2}>
                                    {symbols.yes}{candidate.ok_count}
                                </Badge>
                            </HStack>
                        </HStack>
                        <ProgressBarRect
                            value={candidate.ok_count}
                            max={totalParticipants || 1}
                            trackColor="gray.100"
                            fillColor="green.400"
                        />
                    </Box>
                );
            })}
        </VStack>
    );
}
