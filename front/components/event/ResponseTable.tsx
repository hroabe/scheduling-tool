'use client';

import {
    Box,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Text,
    Badge,
    VStack,
    HStack,
    Tooltip,
    useColorModeValue,
    IconButton,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Edit2, Trash2 } from 'lucide-react';
import type { Schedule, Attendance, AttendanceStatus } from '@/types';
import { formatDate, formatTime } from '@/lib/date';

interface ResponseTableProps {
    schedule: Schedule;
    onRowClick?: (participant: Schedule['participants'][0]) => void;
    onEdit?: (participant: Schedule['participants'][0]) => void;
    onDelete?: (participant: Schedule['participants'][0]) => void;
}

const MotionTr = motion(Tr);

const statusColors: Record<AttendanceStatus, { bg: string; color: string; text: string }> = {
    ok: { bg: 'green.100', color: 'green.700', text: '◯' },
    maybe: { bg: 'yellow.100', color: 'yellow.700', text: '△' },
    ng: { bg: 'red.100', color: 'red.700', text: '×' },
    pending: { bg: 'gray.100', color: 'gray.500', text: '-' },
};

const darkStatusColors: Record<AttendanceStatus, { bg: string; color: string }> = {
    ok: { bg: 'green.800', color: 'green.200' },
    maybe: { bg: 'yellow.800', color: 'yellow.200' },
    ng: { bg: 'red.800', color: 'red.200' },
    pending: { bg: 'gray.700', color: 'gray.400' },
};

function StatusCell({ status, isDark }: { status: AttendanceStatus; isDark: boolean }) {
    const colors = isDark ? darkStatusColors[status] : statusColors[status];
    const text = statusColors[status].text;

    return (
        <Box
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
            w={8}
            h={8}
            borderRadius="lg"
            bg={colors.bg}
            color={colors.color}
            fontWeight="bold"
            fontSize="lg"
        >
            {text}
        </Box>
    );
}

export function ResponseTable({
    schedule,
    onRowClick,
    onEdit,
    onDelete,
}: ResponseTableProps) {
    const isDark = useColorModeValue(false, true);
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const headerBg = useColorModeValue('gray.50', 'gray.700');

    const { candidates, participants } = schedule;

    // Get attendance status for a participant and candidate
    const getAttendance = (
        participantId: number,
        candidateId: number
    ): AttendanceStatus => {
        const participant = participants.find((p) => p.id === participantId);
        if (!participant) return 'pending';

        const attendance = participant.attendances.find(
            (a) => a.candidate === candidateId
        );
        return (attendance?.status as AttendanceStatus) || 'pending';
    };

    if (participants.length === 0) {
        return (
            <Box
                bg={cardBg}
                borderRadius="xl"
                border="1px solid"
                borderColor={borderColor}
                p={12}
                textAlign="center"
            >
                <VStack spacing={4}>
                    <Text fontSize="lg" color="gray.500">
                        まだ回答がありません
                    </Text>
                    <Text fontSize="sm" color="gray.400">
                        URLを共有して回答を集めましょう
                    </Text>
                </VStack>
            </Box>
        );
    }

    return (
        <Box
            bg={cardBg}
            borderRadius="xl"
            border="1px solid"
            borderColor={borderColor}
            overflow="hidden"
        >
            <Box overflowX="auto">
                <Table variant="simple" size="sm">
                    <Thead bg={headerBg}>
                        <Tr>
                            <Th
                                position="sticky"
                                left={0}
                                bg={headerBg}
                                zIndex={1}
                                minW="120px"
                            >
                                参加者
                            </Th>
                            {candidates.map((candidate) => (
                                <Th key={candidate.id} textAlign="center" minW="80px">
                                    <VStack spacing={0}>
                                        <Text fontSize="xs" fontWeight="bold">
                                            {formatDate(candidate.start_at, 'M/d')}
                                        </Text>
                                        <Text fontSize="xs" fontWeight="normal" color="gray.500">
                                            {formatDate(candidate.start_at, 'E')}
                                        </Text>
                                        <Text fontSize="xs" fontWeight="normal">
                                            {formatTime(candidate.start_at)}
                                        </Text>
                                    </VStack>
                                </Th>
                            ))}
                            <Th textAlign="center">コメント</Th>
                            {(onEdit || onDelete) && <Th w="80px"></Th>}
                        </Tr>
                    </Thead>
                    <Tbody>
                        {participants.map((participant, index) => (
                            <MotionTr
                                key={participant.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                                _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                                cursor={onRowClick ? 'pointer' : 'default'}
                                onClick={() => onRowClick?.(participant)}
                            >
                                <Td
                                    position="sticky"
                                    left={0}
                                    bg={cardBg}
                                    fontWeight="medium"
                                    borderRight="1px solid"
                                    borderColor={borderColor}
                                >
                                    {participant.name}
                                </Td>
                                {candidates.map((candidate) => (
                                    <Td key={candidate.id} textAlign="center">
                                        <StatusCell
                                            status={getAttendance(participant.id, candidate.id)}
                                            isDark={isDark}
                                        />
                                    </Td>
                                ))}
                                <Td maxW="200px">
                                    <Tooltip label={participant.comment} placement="top">
                                        <Text noOfLines={1} fontSize="sm" color="gray.600">
                                            {participant.comment || '-'}
                                        </Text>
                                    </Tooltip>
                                </Td>
                                {(onEdit || onDelete) && (
                                    <Td>
                                        <HStack spacing={1}>
                                            {onEdit && (
                                                <IconButton
                                                    aria-label="編集"
                                                    icon={<Edit2 size={14} />}
                                                    size="xs"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEdit(participant);
                                                    }}
                                                />
                                            )}
                                            {onDelete && (
                                                <IconButton
                                                    aria-label="削除"
                                                    icon={<Trash2 size={14} />}
                                                    size="xs"
                                                    variant="ghost"
                                                    colorScheme="red"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(participant);
                                                    }}
                                                />
                                            )}
                                        </HStack>
                                    </Td>
                                )}
                            </MotionTr>
                        ))}

                        {/* Summary Row */}
                        <Tr bg={headerBg} fontWeight="bold">
                            <Td
                                position="sticky"
                                left={0}
                                bg={headerBg}
                                borderRight="1px solid"
                                borderColor={borderColor}
                            >
                                集計
                            </Td>
                            {candidates.map((candidate) => (
                                <Td key={candidate.id} textAlign="center">
                                    <VStack spacing={0}>
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
                            <Td></Td>
                            {(onEdit || onDelete) && <Td></Td>}
                        </Tr>
                    </Tbody>
                </Table>
            </Box>
        </Box>
    );
}
