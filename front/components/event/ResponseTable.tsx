'use client';

import { Badge, Box, Table, Tbody, Td, Text, Th, Thead, Tooltip, Tr, VisuallyHidden, VStack } from '@chakra-ui/react';
import { Trophy } from 'lucide-react';
import type { AttendanceStatus, Schedule } from '@/types';
import { formatDate, formatTime } from '@/lib/date';

interface ResponseTableProps {
    schedule: Schedule;
    /** candidate_id flagged as recommended by the summary API */
    recommendedId?: number | null;
    /** participant id of the viewer's own response (highlighted) */
    myParticipantId?: number | null;
}

const STATUS_STYLE: Record<AttendanceStatus, { colorScheme: string; text: string; label: string }> = {
    ok: { colorScheme: 'green', text: '◯', label: '参加可能' },
    maybe: { colorScheme: 'yellow', text: '△', label: '調整可能' },
    ng: { colorScheme: 'red', text: '×', label: '参加不可' },
    pending: { colorScheme: 'gray', text: '-', label: '未回答' },
};

function StatusCell({ status }: { status: AttendanceStatus }) {
    const style = STATUS_STYLE[status];
    return (
        <Badge
            colorScheme={style.colorScheme}
            variant="subtle"
            fontSize="md"
            minW={8}
            h={8}
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
            borderRadius="lg"
            aria-label={style.label}
        >
            {style.text}
        </Badge>
    );
}

export function ResponseTable({ schedule, recommendedId, myParticipantId }: ResponseTableProps) {
    const { candidates, participants } = schedule;

    const statusMap = new Map<string, AttendanceStatus>();
    for (const participant of participants) {
        for (const attendance of participant.attendances) {
            statusMap.set(`${participant.id}:${attendance.candidate}`, attendance.status);
        }
    }

    if (participants.length === 0) {
        return (
            <Box bg="bg.card" borderRadius="xl" border="1px solid" borderColor="border.default" p={12} textAlign="center">
                <VStack spacing={2}>
                    <Text fontSize="lg" color="text.muted">
                        まだ回答がありません
                    </Text>
                    <Text fontSize="sm" color="text.muted">
                        URLを共有して回答を集めましょう
                    </Text>
                </VStack>
            </Box>
        );
    }

    return (
        <Box bg="bg.card" borderRadius="xl" border="1px solid" borderColor="border.default" overflow="hidden">
            <Box overflowX="auto">
                <Table variant="simple" size="sm" data-testid="response-table">
                    <VisuallyHidden as="caption">参加者ごとの回答状況</VisuallyHidden>
                    <Thead bg="bg.subtle">
                        <Tr>
                            <Th position="sticky" left={0} bg="bg.subtle" zIndex={1} minW="110px" scope="col">
                                参加者
                            </Th>
                            {candidates.map((candidate) => {
                                const isFinalized = schedule.finalized_candidate === candidate.id;
                                const isRecommended = recommendedId === candidate.id;
                                return (
                                    <Th
                                        key={candidate.id}
                                        textAlign="center"
                                        minW="84px"
                                        scope="col"
                                        bg={isFinalized ? 'green.50' : undefined}
                                        _dark={isFinalized ? { bg: 'green.900' } : undefined}
                                    >
                                        <VStack spacing={0}>
                                            <Text fontSize="xs" fontWeight="bold">
                                                {formatDate(candidate.start_at, 'M/d(E)')}
                                            </Text>
                                            <Text fontSize="xs" fontWeight="normal">
                                                {formatTime(candidate.start_at)}〜
                                            </Text>
                                            {isFinalized ? (
                                                <Badge colorScheme="green" variant="solid" fontSize="2xs" mt={1}>
                                                    確定
                                                </Badge>
                                            ) : (
                                                isRecommended && (
                                                    <Badge
                                                        colorScheme="green"
                                                        fontSize="2xs"
                                                        mt={1}
                                                        display="inline-flex"
                                                        alignItems="center"
                                                        gap={0.5}
                                                        data-testid="recommended-badge"
                                                    >
                                                        <Trophy size={10} aria-hidden />
                                                        おすすめ
                                                    </Badge>
                                                )
                                            )}
                                        </VStack>
                                    </Th>
                                );
                            })}
                            <Th scope="col" minW="120px">
                                コメント
                            </Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {participants.map((participant) => {
                            const isMine = participant.id === myParticipantId;
                            return (
                                <Tr key={participant.id} bg={isMine ? 'brand.subtle' : undefined}>
                                    <Th
                                        scope="row"
                                        position="sticky"
                                        left={0}
                                        bg={isMine ? 'brand.subtle' : 'bg.card'}
                                        fontWeight="medium"
                                        textTransform="none"
                                        fontSize="sm"
                                        letterSpacing="normal"
                                        color="chakra-body-text"
                                        borderRight="1px solid"
                                        borderColor="border.default"
                                    >
                                        {participant.name}
                                        {isMine && (
                                            <Badge ml={1} fontSize="2xs" colorScheme="brand">
                                                あなた
                                            </Badge>
                                        )}
                                    </Th>
                                    {candidates.map((candidate) => (
                                        <Td key={candidate.id} textAlign="center">
                                            <StatusCell status={statusMap.get(`${participant.id}:${candidate.id}`) ?? 'pending'} />
                                        </Td>
                                    ))}
                                    <Td maxW="240px">
                                        <Tooltip label={participant.comment} isDisabled={!participant.comment} placement="top">
                                            <Text noOfLines={2} fontSize="sm" color="text.muted">
                                                {participant.comment || '-'}
                                            </Text>
                                        </Tooltip>
                                    </Td>
                                </Tr>
                            );
                        })}

                        <Tr bg="bg.subtle" fontWeight="bold">
                            <Th
                                scope="row"
                                position="sticky"
                                left={0}
                                bg="bg.subtle"
                                borderRight="1px solid"
                                borderColor="border.default"
                            >
                                集計
                            </Th>
                            {candidates.map((candidate) => (
                                <Td key={candidate.id} textAlign="center">
                                    <VStack spacing={0.5}>
                                        <Badge colorScheme="green" fontSize="xs">
                                            ◯ {candidate.ok_count}
                                        </Badge>
                                        {schedule.allow_maybe && (
                                            <Badge colorScheme="yellow" fontSize="xs">
                                                △ {candidate.maybe_count}
                                            </Badge>
                                        )}
                                        <Badge colorScheme="red" fontSize="xs">
                                            × {candidate.ng_count}
                                        </Badge>
                                    </VStack>
                                </Td>
                            ))}
                            <Td />
                        </Tr>
                    </Tbody>
                </Table>
            </Box>
        </Box>
    );
}
