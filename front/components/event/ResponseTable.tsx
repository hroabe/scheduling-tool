'use client';

import React from 'react';

/**
 * ResponseTable - SaaS-quality response table component
 * 
 * Features:
 * - Clean, light borders with proper spacing
 * - Sticky participant column for mobile
 * - Small Tag-based status indicators (○/△/×)
 * - Horizontal summary row layout
 * - Tooltips for truncated names and comments
 * - Row click to edit functionality
 */

import {
    Box,
    Flex,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Text,
    Tag,
    HStack,
    Tooltip,
    useColorModeValue,
    IconButton,
    TableContainer,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Edit2, Trash2 } from 'lucide-react';
import type { Schedule, AttendanceStatus } from '@/types';
import { formatDate, formatTime } from '@/lib/date';
import { useThemeStore, attendanceIcons } from '@/stores/themeStore';
import { useI18n } from '@/providers/I18nProvider';
import { getAvailabilitySymbols } from '@/lib/availabilitySymbols';

interface ResponseTableProps {
    schedule: Schedule;
    ownedParticipantId?: number | null;
    onRowClick?: (participant: Schedule['participants'][0]) => void;
    onEdit?: (participant: Schedule['participants'][0]) => void;
    onDelete?: (participant: Schedule['participants'][0]) => void;
}

const MotionTr = motion(Tr);

// Status labels for accessibility
const statusLabels: Record<AttendanceStatus, string> = {
    ok: '参加可能',
    maybe: '要調整',
    ng: '不可',
    pending: '未回答',
};

// ============================================
// Sub-components for maintainability
// ============================================

/** CandidateHeaderCell - Date header with hierarchical display */
function CandidateHeaderCell({ startAt }: { startAt: string }) {
    return (
        <Flex direction="column" align="center" gap={0}>
            <Text fontSize="md" fontWeight="bold" color="gray.800">
                {formatDate(startAt, 'M/d')}
            </Text>
            <Text fontSize="xs" color="gray.500">
                {formatDate(startAt, 'E')}
            </Text>
            <Text fontSize="xs" color="gray.500">
                {formatTime(startAt)}
            </Text>
        </Flex>
    );
}

/** AvailabilityCell - Small Tag-based status indicator */
function AvailabilityCell({
    status,
    mode,
    locale,
}: {
    status: AttendanceStatus;
    mode: 'light' | 'dark' | 'cute';
    locale: string;
}) {
    const colorSchemes: Record<AttendanceStatus, string> = {
        ok: 'green',
        maybe: 'yellow',
        ng: 'red',
        pending: 'gray',
    };

    // Get display text
    let text: string;
    if (mode === 'cute') {
        const icons = attendanceIcons[mode];
        text = status === 'ok' ? icons.ok : status === 'maybe' ? icons.maybe : status === 'ng' ? icons.ng : '-';
    } else {
        const symbols = getAvailabilitySymbols(locale);
        text = status === 'ok' ? symbols.yes : status === 'maybe' ? symbols.maybe : status === 'ng' ? symbols.no : '-';
    }

    return (
        <Flex justify="center" align="center">
            <Tooltip label={statusLabels[status]} placement="top" hasArrow>
                <Tag
                    size="md"
                    variant="subtle"
                    colorScheme={colorSchemes[status]}
                    borderRadius="full"
                    minW="44px"
                    h="32px"
                    justifyContent="center"
                    fontWeight="semibold"
                    aria-label={statusLabels[status]}
                >
                    {text}
                </Tag>
            </Tooltip>
        </Flex>
    );
}

/** AvailabilityCounts - Horizontal summary chips */
function AvailabilityCounts({
    okCount,
    maybeCount,
    ngCount,
    allowMaybe,
    mode,
}: {
    okCount: number;
    maybeCount: number;
    ngCount: number;
    allowMaybe: boolean;
    mode: 'light' | 'dark' | 'cute';
}) {
    const icons = attendanceIcons[mode];

    return (
        <HStack spacing={1} justify="center" wrap="wrap">
            <Tag size="sm" colorScheme="green" variant="subtle" borderRadius="full">
                {icons.ok}{okCount}
            </Tag>
            {allowMaybe && (
                <Tag size="sm" colorScheme="yellow" variant="subtle" borderRadius="full">
                    {icons.maybe}{maybeCount}
                </Tag>
            )}
            <Tag size="sm" colorScheme="red" variant="subtle" borderRadius="full">
                {icons.ng}{ngCount}
            </Tag>
        </HStack>
    );
}

/** ParticipantCell - Avatar + name with tooltip for truncation */
function ParticipantCell({
    name,
    isFirst,
}: {
    name: string;
    isFirst: boolean;
}) {
    return (
        <HStack spacing={3}>
            <Flex
                align="center"
                justify="center"
                w={8}
                h={8}
                borderRadius="full"
                bg={isFirst ? 'blue.500' : 'gray.400'}
                color="white"
                fontSize="sm"
                fontWeight="bold"
                flexShrink={0}
            >
                {name.charAt(0)}
            </Flex>
            <Tooltip label={name} placement="top" hasArrow openDelay={500}>
                <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color="gray.800"
                    noOfLines={1}
                    maxW="180px"
                >
                    {name}
                </Text>
            </Tooltip>
        </HStack>
    );
}

// ============================================
// Main Component
// ============================================

export function ResponseTable({
    schedule,
    ownedParticipantId,
    onRowClick,
    onEdit,
    onDelete,
}: ResponseTableProps) {
    const mode = useThemeStore((state: { mode: 'light' | 'dark' | 'cute' }) => state.mode);
    const { locale } = useI18n();
    
    // Colors
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const headerBg = useColorModeValue('gray.50', 'gray.700');
    const hoverBg = useColorModeValue('gray.50', 'gray.700');
    const summaryBg = useColorModeValue('gray.50', 'gray.700');

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

    // Empty state
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
                <Flex direction="column" align="center" gap={4}>
                    <Text fontSize="lg" color="gray.500">
                        まだ回答がありません
                    </Text>
                    <Text fontSize="sm" color="gray.400">
                        URLを共有して回答を集めましょう
                    </Text>
                </Flex>
            </Box>
        );
    }

    return (
        <Box
            bg={cardBg}
            borderRadius="xl"
            border="1px solid"
            borderColor={borderColor}
            boxShadow="sm"
            overflow="hidden"
        >
            <TableContainer overflowX="auto">
                <Table
                    variant="simple"
                    size="sm"
                    sx={{
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                    }}
                >
                    <Thead>
                        <Tr>
                            {/* Participant header - sticky */}
                            <Th
                                position="sticky"
                                left={0}
                                bg={headerBg}
                                zIndex={2}
                                minW="220px"
                                maxW="260px"
                                py={3}
                                px={4}
                                fontSize="sm"
                                color="gray.600"
                                fontWeight="600"
                                textTransform="none"
                                borderBottom="1px solid"
                                borderColor={borderColor}
                            >
                                参加者
                            </Th>
                            {/* Candidate date headers */}
                            {candidates.map((candidate) => (
                                <Th
                                    key={candidate.id}
                                    textAlign="center"
                                    minW="140px"
                                    py={3}
                                    px={4}
                                    fontSize="sm"
                                    color="gray.600"
                                    fontWeight="600"
                                    textTransform="none"
                                    borderBottom="1px solid"
                                    borderColor={borderColor}
                                >
                                    <CandidateHeaderCell startAt={candidate.start_at} />
                                </Th>
                            ))}
                            {/* Comment header */}
                            <Th
                                textAlign="center"
                                minW="160px"
                                maxW="320px"
                                py={3}
                                px={4}
                                fontSize="sm"
                                color="gray.600"
                                fontWeight="600"
                                textTransform="none"
                                borderBottom="1px solid"
                                borderColor={borderColor}
                            >
                                コメント
                            </Th>
                            {/* Actions header */}
                            {(onEdit || onDelete) && (
                                <Th
                                    w="80px"
                                    py={3}
                                    px={4}
                                    borderBottom="1px solid"
                                    borderColor={borderColor}
                                />
                            )}
                        </Tr>
                    </Thead>
                    <Tbody>
                        {participants.map((participant, index) => (
                            <MotionTr
                                key={participant.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.15, delay: index * 0.03 }}
                                cursor={onRowClick ? 'pointer' : 'default'}
                                onClick={() => onRowClick?.(participant)}
                                _hover={{ bg: hoverBg }}
                                _focusVisible={{
                                    outline: 'none',
                                    boxShadow: 'inset 0 0 0 2px var(--chakra-colors-blue-400)',
                                }}
                                tabIndex={onRowClick ? 0 : undefined}
                                role={onRowClick ? 'button' : undefined}
                                aria-label={onRowClick ? `${participant.name}の回答を編集` : undefined}
                            >
                                {/* Participant cell - sticky */}
                                <Td
                                    position="sticky"
                                    left={0}
                                    bg={cardBg}
                                    zIndex={1}
                                    py={3}
                                    px={4}
                                    borderBottom="1px solid"
                                    borderColor={borderColor}
                                    _groupHover={{ bg: hoverBg }}
                                >
                                    <ParticipantCell
                                        name={participant.name}
                                        isFirst={index === 0}
                                    />
                                </Td>
                                {/* Candidate availability cells */}
                                {candidates.map((candidate) => (
                                    <Td
                                        key={candidate.id}
                                        textAlign="center"
                                        py={3}
                                        px={4}
                                        borderBottom="1px solid"
                                        borderColor={borderColor}
                                    >
                                        <AvailabilityCell
                                            status={getAttendance(participant.id, candidate.id)}
                                            mode={mode}
                                            locale={locale}
                                        />
                                    </Td>
                                ))}
                                {/* Comment cell */}
                                <Td
                                    maxW="200px"
                                    py={3}
                                    px={4}
                                    borderBottom="1px solid"
                                    borderColor={borderColor}
                                >
                                    <Tooltip
                                        label={participant.comment}
                                        placement="top"
                                        hasArrow
                                        isDisabled={!participant.comment}
                                    >
                                        <Text
                                            noOfLines={1}
                                            fontSize="sm"
                                            color="gray.600"
                                        >
                                            {participant.comment || '-'}
                                        </Text>
                                    </Tooltip>
                                </Td>
                                {/* Action buttons */}
                                {(onEdit || onDelete) && (
                                    <Td
                                        py={3}
                                        px={4}
                                        borderBottom="1px solid"
                                        borderColor={borderColor}
                                    >
                                        <HStack spacing={1}>
                                            {onEdit && ownedParticipantId === participant.id && (
                                                <IconButton
                                                    aria-label="編集"
                                                    icon={<Edit2 size={14} />}
                                                    size="xs"
                                                    variant="ghost"
                                                    onClick={(e: React.MouseEvent) => {
                                                        e.stopPropagation();
                                                        onEdit(participant);
                                                    }}
                                                    _focusVisible={{
                                                        boxShadow: '0 0 0 2px var(--chakra-colors-blue-400)',
                                                    }}
                                                />
                                            )}
                                            {onDelete && ownedParticipantId === participant.id && (
                                                <IconButton
                                                    aria-label="削除"
                                                    icon={<Trash2 size={14} />}
                                                    size="xs"
                                                    variant="ghost"
                                                    colorScheme="red"
                                                    onClick={(e: React.MouseEvent) => {
                                                        e.stopPropagation();
                                                        onDelete(participant);
                                                    }}
                                                    _focusVisible={{
                                                        boxShadow: '0 0 0 2px var(--chakra-colors-red-400)',
                                                    }}
                                                />
                                            )}
                                        </HStack>
                                    </Td>
                                )}
                            </MotionTr>
                        ))}

                        {/* Summary Row */}
                        <Tr bg={summaryBg}>
                            <Td
                                position="sticky"
                                left={0}
                                bg={summaryBg}
                                zIndex={1}
                                py={3}
                                px={4}
                                fontWeight="semibold"
                                fontSize="sm"
                                color="gray.600"
                            >
                                集計
                            </Td>
                            {candidates.map((candidate) => (
                                <Td key={candidate.id} textAlign="center" py={3} px={4}>
                                    <AvailabilityCounts
                                        okCount={candidate.ok_count}
                                        maybeCount={candidate.maybe_count}
                                        ngCount={candidate.ng_count}
                                        allowMaybe={schedule.allow_maybe}
                                        mode={mode}
                                    />
                                </Td>
                            ))}
                            <Td py={3} px={4} />
                            {(onEdit || onDelete) && <Td py={3} px={4} />}
                        </Tr>
                    </Tbody>
                </Table>
            </TableContainer>
        </Box>
    );
}
