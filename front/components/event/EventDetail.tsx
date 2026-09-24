'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    AlertDescription,
    AlertDialog,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    AlertIcon,
    AlertTitle,
    Box,
    Button,
    Container,
    Flex,
    Heading,
    HStack,
    Icon,
    Link,
    Skeleton,
    Stack,
    TabPanel,
    TabPanels,
    Tabs,
    Text,
    Tooltip,
    VStack,
    useClipboard,
    useDisclosure,
    useToast,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    CalendarDays,
    CalendarPlus,
    CheckCircle2,
    Clock,
    ExternalLink,
    FileSpreadsheet,
    KeyRound,
    Lock,
    LockOpen,
    Pencil,
    Share2,
    User,
    Users,
    Video,
} from 'lucide-react';
import { CreatedModal } from './CreatedModal';
import { FixDecisionModal } from './FixDecisionModal';
import { ReminderCard } from './ReminderCard';
import { safeMeetingUrl } from './meetingUrl';
import { ResponseForm } from './ResponseForm';
import { ResponseSuccessModal } from './ResponseSuccessModal';
import { ResponseTable } from './ResponseTable';
import { StatusPill, getDetailStatus } from './StatusPill';
import { SummaryChart } from './SummaryChart';
import { SegmentedTab, SegmentedTabList } from '@/components/ui/SegmentedTabs';
import {
    useCloseSchedule,
    useDeleteParticipant,
    useExportUrls,
    useFinalizeSchedule,
    useReopenSchedule,
    useSchedule,
    useScheduleSummary,
} from '@/hooks/useApi';
import { ApiError } from '@/lib/api';
import { formatDateRange, formatDateTime, formatRelative, googleCalendarUrl } from '@/lib/date';
import { migrateLegacyTokens } from '@/lib/tokenStorage';
import { useI18n } from '@/providers/I18nProvider';
import { useEditKeyStore, useMyResponsesStore } from '@/stores';
import type { Participant, ParticipantWithToken } from '@/types';

function useShareUrl(uuid: string) {
    const [shareUrl, setShareUrl] = useState('');
    useEffect(() => {
        setShareUrl(`${window.location.origin}/event/${uuid}?utm_source=share&utm_medium=link`);
    }, [uuid]);
    return shareUrl;
}

/** The edit key was rejected (or is missing) → ask for it again */
function isAuthError(error: unknown) {
    return (
        error instanceof ApiError &&
        (error.status === 403 || (error.status === 400 && Boolean(error.data && 'edit_key' in error.data)))
    );
}

const TAB_RESPONSES = 0;
const TAB_RESPOND = 1;

export function EventDetail({ uuid }: { uuid: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const toast = useToast();
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState(TAB_RESPONSES);
    const [lastWasUpdate, setLastWasUpdate] = useState(false);
    const [deleting, setDeleting] = useState<Participant | null>(null);
    const [finalizingId, setFinalizingId] = useState<number | null>(null);
    const deleteCancelRef = useRef<HTMLButtonElement>(null);

    const { data: schedule, isLoading, error } = useSchedule(uuid);
    const { data: summary } = useScheduleSummary(uuid);
    const exportUrls = useExportUrls(uuid);
    const shareUrl = useShareUrl(uuid);
    const { hasCopied, onCopy } = useClipboard(shareUrl);

    const deleteParticipant = useDeleteParticipant(uuid);
    const finalize = useFinalizeSchedule(uuid);
    const closeSchedule = useCloseSchedule(uuid);
    const reopenSchedule = useReopenSchedule(uuid);

    const editKey = useEditKeyStore((state) => state.keys[uuid]);
    const clearKey = useEditKeyStore((state) => state.clearKey);
    const myResponse = useMyResponsesStore((state) => state.responses[uuid]);
    const saveResponse = useMyResponsesStore((state) => state.saveResponse);
    const removeResponse = useMyResponsesStore((state) => state.removeResponse);

    const created = useDisclosure();
    const success = useDisclosure();
    const deleteDialog = useDisclosure();
    const fixModal = useDisclosure();

    // Show the "created" dialog once, then drop ?created=1 from the URL
    useEffect(() => {
        if (searchParams.get('created') === '1') {
            created.onOpen();
            router.replace(`/event/${uuid}`, { scroll: false });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // One-time migration of response tokens saved by the previous version (lib/tokenStorage)
    useEffect(() => {
        const { responses, saveResponse: save } = useMyResponsesStore.getState();
        migrateLegacyTokens(responses, save);
    }, []);

    const myParticipant = useMemo(
        () => (myResponse && schedule?.participants.find((p) => p.id === myResponse.participantId)) || null,
        [myResponse, schedule]
    );

    // Organizer = creator signed in with their account, or an edit key verified in this tab
    const isOrganizer = Boolean(schedule?.is_owner) || editKey !== undefined;
    const finalizedCandidate = schedule?.candidates.find((c) => c.id === schedule.finalized_candidate);
    const meetingUrl = safeMeetingUrl(schedule?.meeting_url);

    const handleShare = async () => {
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({ title: schedule?.name, text: t('event.share.text', { name: schedule?.name ?? '' }), url: shareUrl });
                return;
            } catch {
                // User cancelled or share failed; fall back to copying
            }
        }
        onCopy();
        toast({ title: t('event.share.copied'), status: 'success', duration: 2000 });
    };

    const handleManageError = (err: Error) => {
        if (isAuthError(err)) {
            clearKey(uuid);
            toast({ title: t('event.toast.authRequired'), status: 'warning', duration: 4000, isClosable: true });
        } else {
            toast({ title: err.message, status: 'error', duration: 4000, isClosable: true });
        }
    };

    const handleResponseSuccess = (participant: ParticipantWithToken, isUpdate: boolean) => {
        const token = participant.edit_token ?? (isUpdate ? myResponse?.editToken : undefined);
        if (token) saveResponse(uuid, { participantId: participant.id, name: participant.name, editToken: token });
        setLastWasUpdate(isUpdate);
        setActiveTab(TAB_RESPONSES);
        success.onOpen();
    };

    const requestDelete = (participant: Participant) => {
        setDeleting(participant);
        deleteDialog.onOpen();
    };

    const confirmDelete = () => {
        if (!deleting) return;
        const isOwn = deleting.id === myParticipant?.id && Boolean(myResponse?.editToken);
        deleteParticipant.mutate(
            {
                participantId: deleting.id,
                editToken: isOwn ? myResponse?.editToken : undefined,
                editKey: isOwn ? undefined : editKey,
            },
            {
                onSuccess: () => {
                    if (isOwn) removeResponse(uuid);
                    toast({ title: t('event.delete.done'), status: 'success', duration: 3000 });
                },
                onError: handleManageError,
                onSettled: () => {
                    deleteDialog.onClose();
                    setDeleting(null);
                },
            }
        );
    };

    const requestFinalize = (candidateId: number) => {
        setFinalizingId(candidateId);
        fixModal.onOpen();
    };

    const closeFixModal = () => {
        fixModal.onClose();
        setFinalizingId(null);
    };

    const confirmFinalize = () => {
        if (finalizingId === null) return;
        finalize.mutate(
            { candidateId: finalizingId, editKey },
            {
                onSuccess: () => {
                    toast({
                        title: t('event.toast.finalized'),
                        description: t('event.toast.finalizedHint'),
                        status: 'success',
                        duration: 5000,
                        isClosable: true,
                    });
                    closeFixModal();
                },
                onError: (err) => {
                    closeFixModal();
                    handleManageError(err);
                },
            }
        );
    };

    const handleClose = () =>
        closeSchedule.mutate(editKey, {
            onSuccess: () => toast({ title: t('event.toast.closed'), status: 'success', duration: 3000 }),
            onError: handleManageError,
        });

    const handleReopen = () =>
        reopenSchedule.mutate(editKey, {
            onSuccess: () => toast({ title: t('event.toast.reopened'), status: 'success', duration: 3000 }),
            onError: handleManageError,
        });

    if (isLoading) {
        return (
            <Container maxW="container.xl" py={8}>
                <VStack spacing={6} align="stretch">
                    <Skeleton height="140px" borderRadius="xl" />
                    <Skeleton height="400px" borderRadius="xl" />
                </VStack>
            </Container>
        );
    }

    if (error || !schedule) {
        const notFound = error instanceof ApiError && error.status === 404;
        return (
            <Container maxW="container.md" py={16}>
                <Alert status={notFound ? 'warning' : 'error'} borderRadius="xl" flexDirection="column" textAlign="center" py={8}>
                    <AlertIcon boxSize={8} mr={0} />
                    <AlertTitle as="h1" mt={4} mb={1} fontSize="lg">
                        {notFound ? t('event.error.notFound') : t('event.error.loadFailed')}
                    </AlertTitle>
                    <AlertDescription maxW="sm">{notFound ? t('event.error.notFoundHint') : error?.message}</AlertDescription>
                    <Button as={NextLink} href="/create" mt={6}>
                        {t('event.error.createNew')}
                    </Button>
                </Alert>
            </Container>
        );
    }

    const status = getDetailStatus(schedule);
    const finalizingCandidate = summary?.candidates.find((c) => c.candidate_id === finalizingId) ?? null;

    const closedMessage =
        status === 'fixed'
            ? t('event.respond.closedFinalized')
            : status === 'closed'
              ? t('event.respond.closedByOrganizer')
              : status === 'expired'
                ? t('event.respond.closedExpired')
                : t('event.respond.closedInactive');

    return (
        <Container maxW="container.xl" py={{ base: 6, md: 8 }}>
            <VStack spacing={6} align="stretch">
                {/* Event header */}
                <Box
                    as="section"
                    aria-labelledby="event-title"
                    bg="bg.card"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="border.default"
                    boxShadow="sm"
                    p={{ base: 4, md: 6 }}
                >
                    <VStack spacing={4} align="stretch">
                        <Flex justify="space-between" align="start" wrap="wrap" gap={4}>
                            <VStack align="start" spacing={2} flex="1" minW="240px">
                                <HStack flexWrap="wrap" spacing={3}>
                                    <Heading as="h1" size="lg" wordBreak="break-word" id="event-title">
                                        {schedule.name}
                                    </Heading>
                                    <StatusPill status={status} data-testid="status-badge" />
                                </HStack>
                                {schedule.description && (
                                    <Text color="text.muted" whiteSpace="pre-wrap">
                                        {schedule.description}
                                    </Text>
                                )}
                            </VStack>

                            <HStack spacing={2} flexWrap="wrap" className="no-print">
                                <Tooltip label={hasCopied ? t('event.share.copiedShort') : t('event.share.tooltip')}>
                                    <Button
                                        leftIcon={hasCopied ? <CheckCircle2 size={16} /> : <Share2 size={16} />}
                                        size="sm"
                                        onClick={handleShare}
                                    >
                                        {t('event.actions.share')}
                                    </Button>
                                </Tooltip>
                                <Button
                                    as="a"
                                    href={exportUrls.csv}
                                    leftIcon={<FileSpreadsheet size={16} />}
                                    size="sm"
                                    variant="outline"
                                    aria-label={t('event.actions.csvLabel')}
                                    data-testid="export-csv"
                                >
                                    CSV
                                </Button>
                                <Button
                                    as="a"
                                    href={exportUrls.ics()}
                                    leftIcon={<CalendarPlus size={16} />}
                                    size="sm"
                                    variant="outline"
                                    aria-label={t('event.actions.icsLabel')}
                                    data-testid="export-ics"
                                >
                                    ICS
                                </Button>
                                <Button
                                    as={NextLink}
                                    href={`/event/${uuid}/edit`}
                                    leftIcon={<Pencil size={16} />}
                                    size="sm"
                                    variant="outline"
                                    data-testid="edit-link"
                                >
                                    {t('event.actions.edit')}
                                </Button>
                            </HStack>
                        </Flex>

                        <Stack
                            direction={{ base: 'column', sm: 'row' }}
                            spacing={{ base: 1, sm: 6 }}
                            flexWrap="wrap"
                            color="text.muted"
                            fontSize="sm"
                        >
                            <HStack>
                                <Icon as={User} aria-hidden />
                                <Text>
                                    {t('event.meta.owner', { name: schedule.owner_name })}
                                    {schedule.department ? ` (${schedule.department})` : ''}
                                </Text>
                            </HStack>
                            <HStack>
                                <Icon as={CalendarDays} aria-hidden />
                                <Text>{t('event.meta.candidates', { count: schedule.candidates.length })}</Text>
                            </HStack>
                            <HStack>
                                <Icon as={Users} aria-hidden />
                                <Text>{t('event.meta.responses', { count: schedule.participants.length })}</Text>
                            </HStack>
                            {schedule.deadline && (
                                <HStack>
                                    <Icon as={Clock} aria-hidden />
                                    <Text>{t('event.meta.deadline', { date: formatDateTime(schedule.deadline) })}</Text>
                                </HStack>
                            )}
                            <HStack>
                                <Icon as={Clock} aria-hidden />
                                <Text>{t('event.meta.created', { date: formatRelative(schedule.created_at) })}</Text>
                            </HStack>
                        </Stack>

                        {status === 'fixed' && finalizedCandidate && (
                            <Alert status="success" borderRadius="lg" alignItems="start" data-testid="finalized-alert">
                                <AlertIcon />
                                <Box flex="1">
                                    <AlertTitle>{t('event.finalized.title')}</AlertTitle>
                                    <AlertDescription display="block">
                                        <Text fontWeight="bold" my={1}>
                                            {formatDateRange(finalizedCandidate.start_at, finalizedCandidate.end_at)}
                                        </Text>
                                        <HStack spacing={3} flexWrap="wrap" mt={2}>
                                            <Button
                                                as="a"
                                                href={exportUrls.ics(finalizedCandidate.id)}
                                                size="sm"
                                                colorScheme="green"
                                                leftIcon={<CalendarPlus size={14} />}
                                            >
                                                {t('event.finalized.addIcs')}
                                            </Button>
                                            <Link
                                                href={googleCalendarUrl({
                                                    title: schedule.name,
                                                    start: finalizedCandidate.start_at,
                                                    end: finalizedCandidate.end_at,
                                                    details: [schedule.description, meetingUrl, shareUrl.split('?')[0]]
                                                        .filter(Boolean)
                                                        .join('\n\n'),
                                                })}
                                                isExternal
                                                fontSize="sm"
                                                display="inline-flex"
                                                alignItems="center"
                                                gap={1}
                                            >
                                                {t('event.finalized.googleCalendar')} <ExternalLink size={12} aria-hidden />
                                            </Link>
                                        </HStack>
                                    </AlertDescription>
                                </Box>
                            </Alert>
                        )}

                        {status === 'closed' && (
                            <Alert status="warning" borderRadius="lg" data-testid="closed-alert">
                                <AlertIcon />
                                <Box>
                                    <AlertTitle>{t('event.closed.title')}</AlertTitle>
                                    <AlertDescription display="block" fontSize="sm">
                                        {schedule.closed_at
                                            ? t('event.closed.byOrganizer', { date: formatDateTime(schedule.closed_at) })
                                            : t('event.closed.waiting')}
                                    </AlertDescription>
                                </Box>
                            </Alert>
                        )}

                        {status === 'expired' && (
                            <Alert status="warning" borderRadius="lg">
                                <AlertIcon />
                                {t('event.closed.expired', { date: schedule.deadline ? formatDateTime(schedule.deadline) : '' })}
                            </Alert>
                        )}

                        {status === 'open' && schedule.deadline && (
                            <Alert status="info" borderRadius="lg">
                                <AlertIcon />
                                {t('event.meta.deadlineUntil', { date: formatDateTime(schedule.deadline) })}
                            </Alert>
                        )}

                        {meetingUrl && (
                            <HStack
                                spacing={3}
                                p={3}
                                borderRadius="lg"
                                bg="bg.subtle"
                                flexWrap="wrap"
                                justify="space-between"
                                data-testid="meeting-url"
                            >
                                <HStack spacing={2} minW={0}>
                                    <Icon as={Video} aria-hidden />
                                    <Text fontSize="sm" fontWeight="semibold">
                                        {t(`event.meeting.provider.${schedule.meeting_provider ?? 'other'}`)}
                                    </Text>
                                </HStack>
                                <Button
                                    as="a"
                                    href={meetingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    size="sm"
                                    colorScheme="green"
                                    leftIcon={<Video size={14} />}
                                >
                                    {t('event.meeting.join')}
                                </Button>
                            </HStack>
                        )}

                        {isOrganizer && (
                            <Flex
                                className="no-print"
                                gap={3}
                                align={{ base: 'stretch', sm: 'center' }}
                                direction={{ base: 'column', sm: 'row' }}
                                justify="space-between"
                                pt={3}
                                borderTop="1px solid"
                                borderColor="border.default"
                                data-testid="organizer-panel"
                            >
                                <HStack fontSize="sm" color="text.muted">
                                    <Icon as={KeyRound} aria-hidden />
                                    <Text>
                                        {schedule.is_owner ? t('event.organizer.owner') : t('event.organizer.editKey')}{' '}
                                        <Link as={NextLink} href={`/event/${uuid}/edit`} color="brand.fg">
                                            {t('event.organizer.editPage')}
                                        </Link>
                                    </Text>
                                </HStack>
                                {status === 'open' && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        colorScheme="orange"
                                        leftIcon={<Lock size={14} />}
                                        onClick={handleClose}
                                        isLoading={closeSchedule.isPending}
                                    >
                                        {t('event.organizer.close')}
                                    </Button>
                                )}
                                {status === 'closed' && schedule.is_closed && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        leftIcon={<LockOpen size={14} />}
                                        onClick={handleReopen}
                                        isLoading={reopenSchedule.isPending}
                                    >
                                        {t('event.organizer.reopen')}
                                    </Button>
                                )}
                            </Flex>
                        )}
                    </VStack>
                </Box>

                <Tabs index={activeTab} onChange={setActiveTab} variant="unstyled" isLazy lazyBehavior="keepMounted">
                    <SegmentedTabList isFitted={false} className="no-print">
                        <SegmentedTab>{t('event.tabs.responses')}</SegmentedTab>
                        <SegmentedTab>{myParticipant ? t('event.tabs.editMine') : t('event.tabs.respond')}</SegmentedTab>
                        <SegmentedTab>{t('event.tabs.summary')}</SegmentedTab>
                    </SegmentedTabList>

                    <TabPanels>
                        <TabPanel px={0} pt={6}>
                            <VStack spacing={6} align="stretch">
                                <ResponseTable
                                    schedule={schedule}
                                    recommendedId={summary?.recommended_candidate?.candidate_id}
                                    myParticipantId={myParticipant?.id}
                                    isOrganizer={isOrganizer}
                                    onEdit={schedule.can_respond ? () => setActiveTab(TAB_RESPOND) : undefined}
                                    onDelete={requestDelete}
                                />
                                {schedule.can_respond && !myParticipant && (
                                    <Flex justify="center" className="no-print">
                                        <Button size="lg" onClick={() => setActiveTab(TAB_RESPOND)}>
                                            {t('event.respond.cta')}
                                        </Button>
                                    </Flex>
                                )}
                                {isOrganizer && schedule.can_respond && (
                                    <ReminderCard
                                        responseCount={schedule.participants.length}
                                        deadline={schedule.deadline}
                                        onShare={handleShare}
                                    />
                                )}
                            </VStack>
                        </TabPanel>

                        <TabPanel px={0} pt={6}>
                            {schedule.can_respond ? (
                                <ResponseForm
                                    key={myParticipant?.id ?? 'new'}
                                    schedule={schedule}
                                    existing={myParticipant}
                                    editToken={myParticipant ? myResponse?.editToken : undefined}
                                    onSuccess={handleResponseSuccess}
                                />
                            ) : (
                                <Alert status="info" borderRadius="xl" data-testid="respond-closed">
                                    <AlertIcon />
                                    {closedMessage}
                                </Alert>
                            )}
                        </TabPanel>

                        <TabPanel px={0} pt={6}>
                            <SummaryChart
                                schedule={schedule}
                                summary={summary}
                                icsUrl={(id) => exportUrls.ics(id)}
                                isOrganizer={isOrganizer}
                                onFinalize={requestFinalize}
                            />
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </VStack>

            <CreatedModal isOpen={created.isOpen} onClose={created.onClose} shareUrl={shareUrl} editKey={editKey || undefined} />
            <ResponseSuccessModal isOpen={success.isOpen} onClose={success.onClose} isUpdate={lastWasUpdate} />

            {isOrganizer && (
                <FixDecisionModal
                    isOpen={fixModal.isOpen}
                    onClose={closeFixModal}
                    candidate={finalizingCandidate}
                    onConfirm={confirmFinalize}
                    isLoading={finalize.isPending}
                    allowMaybe={schedule.allow_maybe}
                />
            )}

            <AlertDialog isOpen={deleteDialog.isOpen} leastDestructiveRef={deleteCancelRef} onClose={deleteDialog.onClose} isCentered>
                <AlertDialogOverlay>
                    <AlertDialogContent mx={4}>
                        <AlertDialogHeader>{t('event.delete.title')}</AlertDialogHeader>
                        <AlertDialogBody>
                            {deleting?.id === myParticipant?.id
                                ? t('event.delete.bodyOwn')
                                : t('event.delete.body', { name: deleting?.name ?? '' })}
                        </AlertDialogBody>
                        <AlertDialogFooter gap={2}>
                            <Button ref={deleteCancelRef} variant="ghost" colorScheme="gray" onClick={deleteDialog.onClose}>
                                {t('common.cancel')}
                            </Button>
                            <Button colorScheme="red" onClick={confirmDelete} isLoading={deleteParticipant.isPending}>
                                {t('event.delete.confirm')}
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Container>
    );
}
