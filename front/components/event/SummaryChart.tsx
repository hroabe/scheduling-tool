'use client';

import {
    Badge,
    Box,
    Button,
    Card,
    CardBody,
    Flex,
    Heading,
    HStack,
    Icon,
    SimpleGrid,
    Skeleton,
    Text,
    VStack,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { CalendarPlus, TrendingUp, Trophy, Users } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/date';
import type { CandidateSummary, Schedule, ScheduleSummary } from '@/types';

interface SummaryChartProps {
    schedule: Schedule;
    summary?: ScheduleSummary;
    icsUrl: (candidateId: number) => string;
}

const MotionBox = motion.create(Box);

function CandidateBar({
    candidate,
    totalParticipants,
    isFinalized,
    icsUrl,
}: {
    candidate: CandidateSummary;
    totalParticipants: number;
    isFinalized: boolean;
    icsUrl: string;
}) {
    const pct = (n: number) => (totalParticipants > 0 ? (n / totalParticipants) * 100 : 0);
    const highlight = isFinalized || candidate.is_recommended;

    return (
        <Box
            p={4}
            w="full"
            borderRadius="xl"
            border="2px solid"
            borderColor={highlight ? 'green.400' : 'border.default'}
            bg={highlight ? 'green.50' : 'bg.card'}
            _dark={highlight ? { bg: 'rgba(72, 187, 120, 0.12)' } : undefined}
            data-testid="summary-candidate"
        >
            <VStack align="stretch" spacing={3}>
                <Flex justify="space-between" align="start" gap={2} wrap="wrap">
                    <Box>
                        <HStack spacing={2} flexWrap="wrap">
                            <Text fontWeight="bold" fontSize="lg">
                                {formatDate(candidate.start_at, 'M月d日(E)')}
                            </Text>
                            {isFinalized && (
                                <Badge colorScheme="green" variant="solid">
                                    確定
                                </Badge>
                            )}
                            {!isFinalized && candidate.is_recommended && (
                                <MotionBox
                                    as="span"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5, delay: 0.3 }}
                                >
                                    <Badge colorScheme="green" display="inline-flex" alignItems="center" gap={1}>
                                        <Icon as={Trophy} boxSize={3} />
                                        おすすめ
                                    </Badge>
                                </MotionBox>
                            )}
                        </HStack>
                        <Text fontSize="sm" color="text.muted">
                            {formatTime(candidate.start_at)} - {formatTime(candidate.end_at)}
                            {candidate.note ? ` ・ ${candidate.note}` : ''}
                        </Text>
                    </Box>
                    <VStack align="end" spacing={0}>
                        <Text fontSize="2xl" fontWeight="bold" color="green.500" lineHeight={1}>
                            {candidate.ok_count}
                            <Text as="span" fontSize="sm" color="text.muted" fontWeight="normal">
                                {' '}/ {totalParticipants}名
                            </Text>
                        </Text>
                        <Text fontSize="xs" color="text.muted">
                            スコア {candidate.score}
                        </Text>
                    </VStack>
                </Flex>

                <Flex
                    h={3}
                    borderRadius="full"
                    overflow="hidden"
                    bg="gray.100"
                    _dark={{ bg: 'gray.700' }}
                    role="img"
                    aria-label={`◯${candidate.ok_count}名、△${candidate.maybe_count}名、×${candidate.ng_count}名`}
                >
                    <Box w={`${pct(candidate.ok_count)}%`} bg="green.400" transition="width 0.5s ease" />
                    <Box w={`${pct(candidate.maybe_count)}%`} bg="yellow.400" transition="width 0.5s ease" />
                    <Box w={`${pct(candidate.ng_count)}%`} bg="red.400" transition="width 0.5s ease" />
                </Flex>

                <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                    <HStack spacing={4} fontSize="sm">
                        <Text>◯ {candidate.ok_count}</Text>
                        <Text>△ {candidate.maybe_count}</Text>
                        <Text>× {candidate.ng_count}</Text>
                    </HStack>
                    <Button
                        as="a"
                        href={icsUrl}
                        size="xs"
                        variant="ghost"
                        leftIcon={<CalendarPlus size={14} />}
                        aria-label={`${formatDate(candidate.start_at, 'M月d日')}の予定をカレンダーに追加（ICS）`}
                    >
                        カレンダーに追加
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}

function StatCard({ icon, value, label, color }: { icon: typeof Users; value: number; label: string; color: string }) {
    return (
        <Card>
            <CardBody>
                <HStack>
                    <Flex align="center" justify="center" w={12} h={12} borderRadius="xl" bg={`${color}.100`} color={`${color}.600`}>
                        <Icon as={icon} boxSize={6} />
                    </Flex>
                    <Box>
                        <Text fontSize="2xl" fontWeight="bold">
                            {value}
                        </Text>
                        <Text fontSize="sm" color="text.muted">
                            {label}
                        </Text>
                    </Box>
                </HStack>
            </CardBody>
        </Card>
    );
}

export function SummaryChart({ schedule, summary, icsUrl }: SummaryChartProps) {
    if (schedule.participants.length === 0) {
        return (
            <Card>
                <CardBody>
                    <VStack spacing={4} py={8}>
                        <Icon as={Users} boxSize={12} color="gray.400" />
                        <Text color="text.muted">回答があると集計結果が表示されます</Text>
                    </VStack>
                </CardBody>
            </Card>
        );
    }

    if (!summary) {
        return <Skeleton h="300px" borderRadius="xl" />;
    }

    const sorted = [...summary.candidates].sort((a, b) => b.score - a.score);
    const maxOk = Math.max(0, ...summary.candidates.map((c) => c.ok_count));

    return (
        <VStack spacing={6} align="stretch">
            <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
                <StatCard icon={Users} value={summary.total_participants} label="回答者数" color="blue" />
                <StatCard icon={TrendingUp} value={maxOk} label="最大「◯」数" color="green" />
                <StatCard icon={Trophy} value={summary.candidates.length} label="候補日数" color="purple" />
            </SimpleGrid>

            <Card>
                <CardBody>
                    <VStack spacing={4} align="stretch">
                        <Heading as="h2" size="sm">
                            候補日ごとの回答状況（スコア順）
                        </Heading>
                        <Text fontSize="xs" color="text.muted">
                            スコア = ◯×2 + △×1。最もスコアが高い候補に「おすすめ」を表示しています。
                        </Text>
                        <VStack spacing={3}>
                            {sorted.map((candidate) => (
                                <CandidateBar
                                    key={candidate.candidate_id}
                                    candidate={candidate}
                                    totalParticipants={summary.total_participants}
                                    isFinalized={schedule.finalized_candidate === candidate.candidate_id}
                                    icsUrl={icsUrl(candidate.candidate_id)}
                                />
                            ))}
                        </VStack>
                    </VStack>
                </CardBody>
            </Card>
        </VStack>
    );
}
