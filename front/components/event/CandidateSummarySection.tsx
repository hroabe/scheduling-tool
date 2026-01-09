'use client';

import { useState } from 'react';
import {
    Box,
    Flex,
    VStack,
    Card,
    CardBody,
    Heading,
    useColorModeValue,
} from '@chakra-ui/react';
import type { Schedule, CandidateSummary } from '@/types';
import { CandidateSummaryList } from './CandidateSummaryList';
import { CandidateDetailCard } from './CandidateDetailCard';

interface CandidateSummarySectionProps {
    schedule: Schedule;
    candidates: CandidateSummary[];
    recommendedId?: number;
    totalParticipants: number;
    isOrganizer?: boolean;
    onFinalize?: (candidateId: number) => void;
}

export function CandidateSummarySection({
    schedule,
    candidates,
    recommendedId,
    totalParticipants,
    isOrganizer = false,
    onFinalize,
}: CandidateSummarySectionProps) {
    const [selectedId, setSelectedId] = useState<number>(
        recommendedId || candidates[0]?.candidate_id
    );
    const cardBg = useColorModeValue('white', 'gray.800');

    const selectedCandidate = candidates.find(
        (c) => c.candidate_id === selectedId
    );

    if (candidates.length === 0) {
        return null;
    }

    return (
        <Card bg={cardBg} shadow="sm" border="1px solid" borderColor="gray.400">
            <CardBody>
                <VStack spacing={4} align="stretch">
                    <Heading size="sm">候補日ごとの回答状況</Heading>
                    <Box fontSize="sm" color="gray.500" mb={2}>
                        最も「○」が多い候補日を自動でおすすめ表示します。
                    </Box>

                    <Flex
                        direction={{ base: 'column', lg: 'row' }}
                        gap={4}
                        align="flex-start"
                    >
                        {/* Left: Candidate List */}
                        <Box flex={1} minW={{ base: 'full', lg: '300px' }}>
                            <CandidateSummaryList
                                candidates={candidates}
                                recommendedId={recommendedId}
                                selectedId={selectedId}
                                onSelect={setSelectedId}
                                totalParticipants={totalParticipants}
                            />
                        </Box>

                        {/* Right: Detail Card */}
                        {selectedCandidate && (
                            <Box
                                flex={1}
                                minW={{ base: 'full', lg: '280px' }}
                                maxW={{ base: 'full', lg: '350px' }}
                            >
                                <CandidateDetailCard
                                    candidate={selectedCandidate}
                                    isRecommended={selectedCandidate.candidate_id === recommendedId}
                                    totalParticipants={totalParticipants}
                                    isOrganizer={isOrganizer}
                                    isFinalized={schedule.is_finalized}
                                    onFinalize={onFinalize}
                                />
                            </Box>
                        )}
                    </Flex>
                </VStack>
            </CardBody>
        </Card>
    );
}
