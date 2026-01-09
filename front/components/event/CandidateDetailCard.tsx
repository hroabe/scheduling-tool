'use client';

import {
    Box,
    VStack,
    HStack,
    Text,
    Badge,
    Button,
    useColorModeValue,
} from '@chakra-ui/react';
import { Check, Calendar } from 'lucide-react';
import type { CandidateSummary } from '@/types';
import { formatDate, formatTime } from '@/lib/date';
import { useI18n } from '@/providers/I18nProvider';
import { getAvailabilitySymbols } from '@/lib/availabilitySymbols';

interface CandidateDetailCardProps {
    candidate: CandidateSummary;
    isRecommended: boolean;
    totalParticipants: number;
    isOrganizer?: boolean;
    isFinalized?: boolean;
    onFinalize?: (candidateId: number) => void;
}

export function CandidateDetailCard({
    candidate,
    isRecommended,
    totalParticipants,
    isOrganizer = false,
    isFinalized = false,
    onFinalize,
}: CandidateDetailCardProps) {
    const { locale } = useI18n();
    const symbols = getAvailabilitySymbols(locale);
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.300', 'gray.600');
    const recommendedBorder = useColorModeValue('green.400', 'green.500');

    // Calculate stacked bar percentages
    const total = candidate.ok_count + candidate.maybe_count + candidate.ng_count;
    const okPercent = total > 0 ? (candidate.ok_count / total) * 100 : 0;
    const maybePercent = total > 0 ? (candidate.maybe_count / total) * 100 : 0;
    const ngPercent = total > 0 ? (candidate.ng_count / total) * 100 : 0;

    return (
        <Box
            p={4}
            borderRadius="xl"
            border="2px solid"
            borderColor={isRecommended ? recommendedBorder : borderColor}
            bg={cardBg}
        >
            <VStack spacing={4} align="stretch">
                {/* Header with date and badge */}
                <HStack justify="space-between" align="flex-start">
                    <VStack align="start" spacing={0}>
                        <Text fontSize="xl" fontWeight="bold">
                            {formatDate(candidate.start_at, 'M/d')}（{formatDate(candidate.start_at, 'E')}）
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                            {formatTime(candidate.start_at)} - {formatTime(candidate.end_at)}
                        </Text>
                    </VStack>
                    <VStack align="end" spacing={1}>
                        {isRecommended && (
                            <Badge colorScheme="green" px={2} py={1}>
                                おすすめ
                            </Badge>
                        )}
                        <Text fontSize="sm" color="gray.600">
                            {candidate.ok_count + candidate.maybe_count + candidate.ng_count}/{totalParticipants}名
                        </Text>
                    </VStack>
                </HStack>

                {/* Stacked progress bar */}
                <Box>
                    <HStack h="16px" borderRadius="2px" overflow="hidden" bg="gray.100" spacing={0}>
                        <Box
                            h="full"
                            w={`${okPercent}%`}
                            bg="green.400"
                            transition="width 0.3s"
                        />
                        <Box
                            h="full"
                            w={`${maybePercent}%`}
                            bg="yellow.400"
                            transition="width 0.3s"
                        />
                        <Box
                            h="full"
                            w={`${ngPercent}%`}
                            bg="red.400"
                            transition="width 0.3s"
                        />
                    </HStack>
                </Box>

                {/* Response breakdown chips */}
                <HStack justify="center" spacing={3}>
                    <HStack
                        bg="green.50"
                        color="green.700"
                        px={3}
                        py={1}
                        borderRadius="full"
                        fontSize="sm"
                    >
                        <Text>{symbols.yes}</Text>
                        <Text fontWeight="bold">{candidate.ok_count}</Text>
                    </HStack>
                    <HStack
                        bg="yellow.50"
                        color="yellow.700"
                        px={3}
                        py={1}
                        borderRadius="full"
                        fontSize="sm"
                    >
                        <Text>{symbols.maybe}</Text>
                        <Text fontWeight="bold">{candidate.maybe_count}</Text>
                    </HStack>
                    <HStack
                        bg="red.50"
                        color="red.700"
                        px={3}
                        py={1}
                        borderRadius="full"
                        fontSize="sm"
                    >
                        <Text>{symbols.no}</Text>
                        <Text fontWeight="bold">{candidate.ng_count}</Text>
                    </HStack>
                </HStack>

                {/* Finalize button (organizer only, not finalized) */}
                {isOrganizer && !isFinalized && onFinalize && (
                    <Button
                        colorScheme="brand"
                        size="md"
                        leftIcon={<Check size={18} />}
                        onClick={() => onFinalize(candidate.candidate_id)}
                        w="full"
                    >
                        この候補で確定
                    </Button>
                )}

                {/* Show finalized badge if this is the finalized candidate */}
                {isFinalized && (
                    <HStack
                        justify="center"
                        bg="green.50"
                        color="green.700"
                        py={2}
                        borderRadius="md"
                    >
                        <Calendar size={16} />
                        <Text fontWeight="medium">確定済み</Text>
                    </HStack>
                )}
            </VStack>
        </Box>
    );
}
