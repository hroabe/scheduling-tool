'use client';

import {
    Badge,
    Box,
    HStack,
    IconButton,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tooltip,
    Tr,
    VisuallyHidden,
    VStack,
} from '@chakra-ui/react';
import { Pencil, Trash2, Trophy } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/date';
import { useAvailabilitySymbols, type AvailabilitySymbols } from '@/lib/availabilitySymbols';
import { useI18n } from '@/providers/I18nProvider';
import type { AttendanceStatus, Participant, Schedule } from '@/types';

interface ResponseTableProps {
    schedule: Schedule;
    /** candidate_id flagged as recommended by the summary API */
    recommendedId?: number | null;
    /** participant id of the viewer's own response (highlighted, editable) */
    myParticipantId?: number | null;
    /** Organizers (owner or edit key) may delete any response */
    isOrganizer?: boolean;
    /** Edit the viewer's own response */
    onEdit?: (participant: Participant) => void;
    /** Delete a response (own response, or any response for organizers) */
    onDelete?: (participant: Participant) => void;
}

const COLOR_SCHEME: Record<AttendanceStatus, string> = {
    ok: 'green',
    maybe: 'yellow',
    ng: 'red',
    pending: 'gray',
};

function symbolFor(status: AttendanceStatus, symbols: AvailabilitySymbols) {
    if (status === 'ok') return symbols.yes;
    if (status === 'maybe') return symbols.maybe;
    if (status === 'ng') return symbols.no;
    return '-';
}

function StatusCell({ status, symbols, label }: { status: AttendanceStatus; symbols: AvailabilitySymbols; label: string }) {
    return (
        <Badge
            colorScheme={COLOR_SCHEME[status]}
            variant="subtle"
            fontSize="md"
            minW={8}
            h={8}
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
            borderRadius="lg"
            aria-label={label}
        >
            {symbolFor(status, symbols)}
        </Badge>
    );
}

export function ResponseTable({ schedule, recommendedId, myParticipantId, isOrganizer = false, onEdit, onDelete }: ResponseTableProps) {
    const { t } = useI18n();
    const symbols = useAvailabilitySymbols();
    const { candidates, participants } = schedule;

    const statusMap = new Map<string, AttendanceStatus>();
    for (const participant of participants) {
        for (const attendance of participant.attendances) {
            statusMap.set(`${participant.id}:${attendance.candidate}`, attendance.status);
        }
    }

    const canEdit = (participant: Participant) => Boolean(onEdit) && participant.id === myParticipantId;
    const canDelete = (participant: Participant) =>
        Boolean(onDelete) && (participant.id === myParticipantId || isOrganizer);
    const showActions = participants.some((p) => canEdit(p) || canDelete(p));

    if (participants.length === 0) {
        return (
            <Box bg="bg.card" borderRadius="xl" border="1px solid" borderColor="border.default" p={12} textAlign="center">
                <VStack spacing={2}>
                    <Text fontSize="lg" color="text.muted">
                        {t('response.table.empty')}
                    </Text>
                    <Text fontSize="sm" color="text.muted">
                        {t('response.table.emptyHint')}
                    </Text>
                </VStack>
            </Box>
        );
    }

    return (
        <Box bg="bg.card" borderRadius="xl" border="1px solid" borderColor="border.default" overflow="hidden" boxShadow="sm">
            <Box overflowX="auto">
                <Table variant="simple" size="sm" data-testid="response-table">
                    <VisuallyHidden as="caption">{t('response.table.caption')}</VisuallyHidden>
                    <Thead bg="bg.subtle">
                        <Tr>
                            <Th position="sticky" left={0} bg="bg.subtle" zIndex={1} minW="120px" scope="col" textTransform="none">
                                {t('response.table.participant')}
                            </Th>
                            {candidates.map((candidate) => {
                                const isFinalized = schedule.finalized_candidate === candidate.id;
                                const isRecommended = recommendedId === candidate.id;
                                return (
                                    <Th
                                        key={candidate.id}
                                        textAlign="center"
                                        minW="88px"
                                        scope="col"
                                        textTransform="none"
                                        bg={isFinalized ? 'green.50' : undefined}
                                        _dark={isFinalized ? { bg: 'rgba(72, 187, 120, 0.16)' } : undefined}
                                    >
                                        <VStack spacing={0}>
                                            <Text fontSize="xs" fontWeight="bold">
                                                {formatDate(candidate.start_at, t('event.format.dayShort'))}
                                            </Text>
                                            <Text fontSize="xs" fontWeight="normal">
                                                {formatTime(candidate.start_at)}-{formatTime(candidate.end_at)}
                                            </Text>
                                            {isFinalized ? (
                                                <Badge colorScheme="green" variant="solid" fontSize="2xs" mt={1}>
                                                    {t('response.table.finalized')}
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
                                                        {t('response.table.recommended')}
                                                    </Badge>
                                                )
                                            )}
                                        </VStack>
                                    </Th>
                                );
                            })}
                            <Th scope="col" minW="120px" textTransform="none">
                                {t('response.table.comment')}
                            </Th>
                            {showActions && (
                                <Th scope="col" textTransform="none">
                                    <VisuallyHidden>{t('response.table.actions')}</VisuallyHidden>
                                </Th>
                            )}
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
                                                {t('response.table.you')}
                                            </Badge>
                                        )}
                                    </Th>
                                    {candidates.map((candidate) => {
                                        const status = statusMap.get(`${participant.id}:${candidate.id}`) ?? 'pending';
                                        return (
                                            <Td key={candidate.id} textAlign="center">
                                                <StatusCell
                                                    status={status}
                                                    symbols={symbols}
                                                    label={t(`response.status.${status}`)}
                                                />
                                            </Td>
                                        );
                                    })}
                                    <Td maxW="240px">
                                        <Tooltip label={participant.comment} isDisabled={!participant.comment} placement="top">
                                            <Text noOfLines={2} fontSize="sm" color="text.muted">
                                                {participant.comment || '-'}
                                            </Text>
                                        </Tooltip>
                                    </Td>
                                    {showActions && (
                                        <Td className="no-print">
                                            <HStack spacing={1} justify="end">
                                                {canEdit(participant) && (
                                                    <IconButton
                                                        aria-label={t('response.table.editResponse', { name: participant.name })}
                                                        icon={<Pencil size={14} />}
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => onEdit?.(participant)}
                                                    />
                                                )}
                                                {canDelete(participant) && (
                                                    <IconButton
                                                        aria-label={t('response.table.deleteResponse', { name: participant.name })}
                                                        icon={<Trash2 size={14} />}
                                                        size="sm"
                                                        variant="ghost"
                                                        colorScheme="red"
                                                        onClick={() => onDelete?.(participant)}
                                                    />
                                                )}
                                            </HStack>
                                        </Td>
                                    )}
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
                                textTransform="none"
                            >
                                {t('response.table.total')}
                            </Th>
                            {candidates.map((candidate) => (
                                <Td key={candidate.id} textAlign="center">
                                    <VStack spacing={0.5}>
                                        <Badge
                                            colorScheme="green"
                                            fontSize="xs"
                                            aria-label={t('response.table.countLabel', {
                                                status: t('response.status.ok'),
                                                count: candidate.ok_count,
                                            })}
                                        >
                                            {symbols.yes} {candidate.ok_count}
                                        </Badge>
                                        {schedule.allow_maybe && (
                                            <Badge
                                                colorScheme="yellow"
                                                fontSize="xs"
                                                aria-label={t('response.table.countLabel', {
                                                    status: t('response.status.maybe'),
                                                    count: candidate.maybe_count,
                                                })}
                                            >
                                                {symbols.maybe} {candidate.maybe_count}
                                            </Badge>
                                        )}
                                        <Badge
                                            colorScheme="red"
                                            fontSize="xs"
                                            aria-label={t('response.table.countLabel', {
                                                status: t('response.status.ng'),
                                                count: candidate.ng_count,
                                            })}
                                        >
                                            {symbols.no} {candidate.ng_count}
                                        </Badge>
                                    </VStack>
                                </Td>
                            ))}
                            <Td />
                            {showActions && <Td />}
                        </Tr>
                    </Tbody>
                </Table>
            </Box>
        </Box>
    );
}
