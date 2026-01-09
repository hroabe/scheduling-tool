'use client';

/**
 * SummaryCandidateCard - Per-candidate summary with stacked bar
 * Shows ○△× distribution and "おすすめ" badge for recommended
 */

import {
    Box,
    Flex,
    HStack,
    VStack,
    Text,
    Badge,
    useColorModeValue,
} from '@chakra-ui/react';
import { formatDateTime } from '@/lib/date';
import { useI18n } from '@/providers/I18nProvider';
import { getAvailabilitySymbols } from '@/lib/availabilitySymbols';

interface CandidateSummary {
    id: number;
    start_at: string;
    end_at?: string;
    okCount: number;
    maybeCount: number;
    ngCount: number;
    isRecommended?: boolean;
}

interface SummaryCandidateCardProps {
    candidate: CandidateSummary;
    totalParticipants: number;
}

export function SummaryCandidateCard({
    candidate,
    totalParticipants,
}: SummaryCandidateCardProps) {
    const { locale } = useI18n();
    const symbols = getAvailabilitySymbols(locale);

    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.300', 'gray.600');
    const subtitleColor = useColorModeValue('gray.600', 'gray.400');

    // Calculate percentages for stacked bar
    const total = candidate.okCount + candidate.maybeCount + candidate.ngCount;
    const okPct = total > 0 ? (candidate.okCount / total) * 100 : 0;
    const maybePct = total > 0 ? (candidate.maybeCount / total) * 100 : 0;
    const ngPct = total > 0 ? (candidate.ngCount / total) * 100 : 0;

    return (
        <Box
            bg={cardBg}
            borderRadius="xl"
            border="1px solid"
            borderColor={candidate.isRecommended ? 'green.400' : borderColor}
            p={{ base: 4, md: 5 }}
            boxShadow={candidate.isRecommended ? 'md' : 'sm'}
            position="relative"
        >
            {candidate.isRecommended && (
                <Badge
                    colorScheme="green"
                    position="absolute"
                    top={-2}
                    right={3}
                    px={2}
                    py={0.5}
                    borderRadius="md"
                    fontSize="xs"
                >
                    おすすめ
                </Badge>
            )}

            <VStack align="stretch" spacing={3}>
                {/* Date/time */}
                <Text fontWeight="semibold" fontSize={{ base: 'sm', md: 'md' }}>
                    {formatDateTime(candidate.start_at)}
                    {candidate.end_at && ` 〜 ${formatDateTime(candidate.end_at)}`}
                </Text>

                {/* Stacked bar */}
                <Flex h="8px" borderRadius="4px" overflow="hidden">
                    {okPct > 0 && (
                        <Box bg="green.400" w={`${okPct}%`} />
                    )}
                    {maybePct > 0 && (
                        <Box bg="yellow.400" w={`${maybePct}%`} />
                    )}
                    {ngPct > 0 && (
                        <Box bg="red.400" w={`${ngPct}%`} />
                    )}
                    {total === 0 && (
                        <Box bg="gray.200" w="100%" />
                    )}
                </Flex>

                {/* Legend */}
                <HStack spacing={4} fontSize="sm" color={subtitleColor}>
                    <HStack spacing={1}>
                        <Box w="12px" h="12px" bg="green.400" borderRadius="2px" />
                        <Text>{symbols.yes} {candidate.okCount}</Text>
                    </HStack>
                    <HStack spacing={1}>
                        <Box w="12px" h="12px" bg="yellow.400" borderRadius="2px" />
                        <Text>{symbols.maybe} {candidate.maybeCount}</Text>
                    </HStack>
                    <HStack spacing={1}>
                        <Box w="12px" h="12px" bg="red.400" borderRadius="2px" />
                        <Text>{symbols.no} {candidate.ngCount}</Text>
                    </HStack>
                </HStack>
            </VStack>
        </Box>
    );
}
