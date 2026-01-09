'use client';

import {
    Box,
    VStack,
    HStack,
    Text,
    Badge,
    Card,
    CardBody,
    Heading,
    Progress,
    SimpleGrid,
    useColorModeValue,
    Flex,
    Icon,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Trophy, Users, TrendingUp } from 'lucide-react';
import type { Schedule, ScheduleSummary, CandidateSummary } from '@/types';
import { formatDate, formatTime } from '@/lib/date';
import { useI18n } from '@/providers/I18nProvider';
import { getAvailabilitySymbols } from '@/lib/availabilitySymbols';

interface SummaryChartProps {
    schedule: Schedule;
    summary?: ScheduleSummary;
}

const MotionBox = motion(Box);

function CandidateBar({
    candidate,
    totalParticipants,
    isRecommended,
    index,
    recommendedBg,
    symbols,
}: {
    candidate: CandidateSummary;
    totalParticipants: number;
    isRecommended: boolean;
    index: number;
    recommendedBg: string;
    symbols: { yes: string; maybe: string; no: string };
}) {
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    const okPercent = totalParticipants > 0 ? (candidate.ok_count / totalParticipants) * 100 : 0;
    const maybePercent = totalParticipants > 0 ? (candidate.maybe_count / totalParticipants) * 100 : 0;
    const ngPercent = totalParticipants > 0 ? (candidate.ng_count / totalParticipants) * 100 : 0;

    return (
        <MotionBox
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
        >
            <Box
                p={4}
                borderRadius="xl"
                border="2px solid"
                borderColor={isRecommended ? 'green.400' : borderColor}
                bg={isRecommended ? recommendedBg : cardBg}
                position="relative"
                overflow="hidden"
            >
                {isRecommended && (
                    <Badge
                        position="absolute"
                        top={2}
                        right={2}
                        colorScheme="green"
                        display="flex"
                        alignItems="center"
                        gap={1}
                    >
                        <Icon as={Trophy} boxSize={3} />
                        おすすめ
                    </Badge>
                )}

                <VStack align="stretch" spacing={3}>
                    {/* Date Info */}
                    <HStack justify="space-between">
                        <VStack align="start" spacing={0}>
                            <HStack>
                                <Text fontWeight="bold" fontSize="lg">
                                    {formatDate(candidate.start_at, 'M月d日')}
                                </Text>
                                <Text color="gray.500">
                                    ({formatDate(candidate.start_at, 'E')})
                                </Text>
                            </HStack>
                            <Text fontSize="sm" color="gray.600">
                                {formatTime(candidate.start_at)} - {formatTime(candidate.end_at)}
                            </Text>
                        </VStack>
                        <VStack align="end" spacing={0}>
                            <Text fontSize="2xl" fontWeight="bold" color="green.500">
                                {candidate.ok_count}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                                / {totalParticipants}名
                            </Text>
                        </VStack>
                    </HStack>

                    {/* Progress Bar */}
                    <Box>
                        <HStack h={4} borderRadius="full" overflow="hidden" bg="gray.100">
                            <Box
                                h="full"
                                w={`${okPercent}%`}
                                bg="green.400"
                                transition="width 0.5s ease"
                            />
                            <Box
                                h="full"
                                w={`${maybePercent}%`}
                                bg="yellow.400"
                                transition="width 0.5s ease"
                            />
                            <Box
                                h="full"
                                w={`${ngPercent}%`}
                                bg="red.400"
                                transition="width 0.5s ease"
                            />
                        </HStack>
                    </Box>

                    {/* Stats */}
                    <HStack justify="center" spacing={4}>
                        <HStack>
                            <Box w={3} h={3} borderRadius="full" bg="green.400" />
                            <Text fontSize="sm">{symbols.yes} {candidate.ok_count}</Text>
                        </HStack>
                        <HStack>
                            <Box w={3} h={3} borderRadius="full" bg="yellow.400" />
                            <Text fontSize="sm">{symbols.maybe} {candidate.maybe_count}</Text>
                        </HStack>
                        <HStack>
                            <Box w={3} h={3} borderRadius="full" bg="red.400" />
                            <Text fontSize="sm">{symbols.no} {candidate.ng_count}</Text>
                        </HStack>
                    </HStack>
                </VStack>
            </Box>
        </MotionBox>
    );
}

export function SummaryChart({ schedule, summary }: SummaryChartProps) {
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const recommendedBg = useColorModeValue('green.50', 'green.900');
    const { locale } = useI18n();
    const symbols = getAvailabilitySymbols(locale);

    // Build summary from schedule if API summary not available
    const candidateSummaries: CandidateSummary[] = summary?.candidates ||
        schedule.candidates.map((c) => ({
            candidate_id: c.id,
            start_at: c.start_at,
            end_at: c.end_at,
            ok_count: c.ok_count,
            maybe_count: c.maybe_count,
            ng_count: c.ng_count,
            score: c.ok_count * 2 + c.maybe_count,
        }));

    const totalParticipants = summary?.total_participants || schedule.participants.length;

    // Find recommended candidate
    const recommendedId = summary?.recommended_candidate?.candidate_id ||
        candidateSummaries.reduce((best, current) =>
            current.score > (best?.score || -1) ? current : best,
            candidateSummaries[0]
        )?.candidate_id;

    if (schedule.participants.length === 0) {
        return (
            <Card bg={cardBg} shadow="sm">
                <CardBody>
                    <VStack spacing={4} py={8}>
                        <Icon as={Users} boxSize={12} color="gray.400" />
                        <Text color="gray.500">回答があると集計結果が表示されます</Text>
                    </VStack>
                </CardBody>
            </Card>
        );
    }

    return (
        <VStack spacing={6} align="stretch">
            {/* Summary Stats */}
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Card bg={cardBg} shadow="sm" border="1px solid" borderColor="gray.400">
                    <CardBody>
                        <HStack>
                            <Flex
                                align="center"
                                justify="center"
                                w={12}
                                h={12}
                                borderRadius="xl"
                                bg="blue.100"
                                color="blue.600"
                            >
                                <Icon as={Users} boxSize={6} />
                            </Flex>
                            <VStack align="start" spacing={0}>
                                <Text fontSize="2xl" fontWeight="bold">
                                    {totalParticipants}
                                </Text>
                                <Text fontSize="sm" color="gray.500">
                                    回答者数
                                </Text>
                            </VStack>
                        </HStack>
                    </CardBody>
                </Card>

                <Card bg={cardBg} shadow="sm" border="1px solid" borderColor="gray.400">
                    <CardBody>
                        <HStack>
                            <Flex
                                align="center"
                                justify="center"
                                w={12}
                                h={12}
                                borderRadius="xl"
                                bg="green.100"
                                color="green.600"
                            >
                                <Icon as={TrendingUp} boxSize={6} />
                            </Flex>
                            <VStack align="start" spacing={0}>
                                <Text fontSize="2xl" fontWeight="bold">
                                    {Math.max(...candidateSummaries.map((c) => c.ok_count))}
                                </Text>
                                <Text fontSize="sm" color="gray.500">
                                    最大「{symbols.yes}」数
                                </Text>
                            </VStack>
                        </HStack>
                    </CardBody>
                </Card>

                <Card bg={cardBg} shadow="sm" border="1px solid" borderColor="gray.400">
                    <CardBody>
                        <HStack>
                            <Flex
                                align="center"
                                justify="center"
                                w={12}
                                h={12}
                                borderRadius="xl"
                                bg="purple.100"
                                color="purple.600"
                            >
                                <Icon as={Trophy} boxSize={6} />
                            </Flex>
                            <VStack align="start" spacing={0}>
                                <Text fontSize="2xl" fontWeight="bold">
                                    {schedule.candidates.length}
                                </Text>
                                <Text fontSize="sm" color="gray.500">
                                    候補日数
                                </Text>
                            </VStack>
                        </HStack>
                    </CardBody>
                </Card>
            </SimpleGrid>
        </VStack>
    );
}
