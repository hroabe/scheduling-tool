'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    AlertDialog,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    AlertIcon,
    Badge,
    Box,
    Button,
    Card,
    CardBody,
    Container,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Heading,
    HStack,
    Input,
    Link,
    Radio,
    RadioGroup,
    Skeleton,
    Switch,
    Text,
    Textarea,
    VStack,
    useDisclosure,
    useToast,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ExternalLink, Lock, LockOpen, Save, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CandidateManager } from './CandidateManager';
import { EditKeyModal } from './EditKeyModal';
import { StatusPill, getDetailStatus } from '@/components/event/StatusPill';
import { safeMeetingUrl } from '@/components/event/meetingUrl';
import {
    useCloseSchedule,
    useDeleteSchedule,
    useFinalizeSchedule,
    useReopenSchedule,
    useSchedule,
    useScheduleSummary,
    useUpdateSchedule,
} from '@/hooks/useApi';
import { ApiError } from '@/lib/api';
import { useAvailabilitySymbols } from '@/lib/availabilitySymbols';
import { formatDateRange, formatDateTime, localInputToISO, toLocalDateTimeString } from '@/lib/date';
import { useI18n } from '@/providers/I18nProvider';
import { useEditKeyStore } from '@/stores';
import type { Schedule } from '@/types';

type InfoValues = {
    name: string;
    description: string;
    deadline: string;
    isActive: boolean;
    allowMaybe: boolean;
};

function isAuthError(error: unknown) {
    return (
        error instanceof ApiError &&
        (error.status === 403 || (error.status === 400 && Boolean(error.data && 'edit_key' in error.data)))
    );
}

function SectionCard({ title, children, tone, testId }: { title: string; children: React.ReactNode; tone?: 'danger'; testId?: string }) {
    return (
        <Card as="section" borderColor={tone === 'danger' ? 'red.300' : undefined} data-testid={testId}>
            <CardBody>
                <Heading as="h2" size="md" mb={4} color={tone === 'danger' ? 'red.500' : undefined} _dark={tone === 'danger' ? { color: 'red.300' } : undefined}>
                    {title}
                </Heading>
                {children}
            </CardBody>
        </Card>
    );
}

function EventInfoForm({
    schedule,
    editKey,
    onAuthError,
}: {
    schedule: Schedule;
    editKey?: string;
    onAuthError: (e: Error) => boolean;
}) {
    const toast = useToast();
    const { t } = useI18n();
    const update = useUpdateSchedule(schedule.uuid);
    const infoSchema = useMemo(
        () =>
            z.object({
                name: z.string().trim().min(1, t('edit.info.nameRequired')).max(200, t('edit.info.nameTooLong')),
                description: z.string().max(2000, t('edit.info.descriptionTooLong')),
                deadline: z.string(),
                isActive: z.boolean(),
                allowMaybe: z.boolean(),
            }),
        [t]
    );
    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, dirtyFields, isDirty },
    } = useForm<InfoValues>({
        resolver: zodResolver(infoSchema),
        defaultValues: {
            name: schedule.name,
            description: schedule.description,
            deadline: schedule.deadline ? toLocalDateTimeString(schedule.deadline) : '',
            isActive: schedule.is_active,
            allowMaybe: schedule.allow_maybe,
        },
    });

    const onSubmit = (values: InfoValues) => {
        if (dirtyFields.deadline && values.deadline && new Date(values.deadline) <= new Date()) {
            setError('deadline', { message: t('edit.info.deadlinePast') });
            return;
        }
        update.mutate(
            {
                schedule: {
                    name: values.name.trim(),
                    description: values.description,
                    is_active: values.isActive,
                    allow_maybe: values.allowMaybe,
                    // Only send the deadline when it was changed (an old, past deadline would fail validation)
                    ...(dirtyFields.deadline ? { deadline: localInputToISO(values.deadline) } : {}),
                },
                editKey,
            },
            {
                onSuccess: (updated) => {
                    toast({ title: t('edit.info.saved'), status: 'success', duration: 2000 });
                    reset({
                        name: updated.name,
                        description: updated.description,
                        deadline: updated.deadline ? toLocalDateTimeString(updated.deadline) : '',
                        isActive: updated.is_active,
                        allowMaybe: updated.allow_maybe,
                    });
                },
                onError: (error) => {
                    if (!onAuthError(error)) toast({ title: error.message, status: 'error', duration: 4000 });
                },
            }
        );
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <VStack spacing={4} align="stretch">
                <FormControl isRequired isInvalid={!!errors.name}>
                    <FormLabel>{t('edit.info.name')}</FormLabel>
                    <Input {...register('name')} />
                    <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={!!errors.description}>
                    <FormLabel>{t('edit.info.description')}</FormLabel>
                    <Textarea {...register('description')} rows={3} />
                    <FormErrorMessage>{errors.description?.message}</FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={!!errors.deadline}>
                    <FormLabel>{t('edit.info.deadline')}</FormLabel>
                    <Input type="datetime-local" {...register('deadline')} />
                    <FormErrorMessage>{errors.deadline?.message}</FormErrorMessage>
                </FormControl>
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel htmlFor="is-active" mb={0}>
                        {t('edit.info.isActive')}
                    </FormLabel>
                    <Switch id="is-active" {...register('isActive')} />
                </FormControl>
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel htmlFor="edit-allow-maybe" mb={0}>
                        {t('edit.info.allowMaybe')}
                    </FormLabel>
                    <Switch id="edit-allow-maybe" {...register('allowMaybe')} />
                </FormControl>
                <Button type="submit" leftIcon={<Save size={16} />} isLoading={update.isPending} isDisabled={!isDirty} alignSelf="end">
                    {t('edit.info.save')}
                </Button>
            </VStack>
        </form>
    );
}

export function EditEventPage({ uuid }: { uuid: string }) {
    const router = useRouter();
    const toast = useToast();
    const { t } = useI18n();
    const symbols = useAvailabilitySymbols();
    const storedKey = useEditKeyStore((state) => state.keys[uuid]);
    const setKey = useEditKeyStore((state) => state.setKey);
    const clearKey = useEditKeyStore((state) => state.clearKey);
    const [hydrated, setHydrated] = useState(false);

    const { data: schedule, isLoading, error } = useSchedule(uuid);
    const { data: summary } = useScheduleSummary(uuid);
    const finalize = useFinalizeSchedule(uuid);
    const closeSchedule = useCloseSchedule(uuid);
    const reopenSchedule = useReopenSchedule(uuid);
    const deleteSchedule = useDeleteSchedule(uuid);
    const [selectedCandidate, setSelectedCandidate] = useState<string>('');
    const deleteDialog = useDisclosure();
    const cancelRef = useRef<HTMLButtonElement>(null);

    // sessionStorage is only available after mount; avoid flashing the key dialog during hydration
    useEffect(() => setHydrated(true), []);

    useEffect(() => {
        if (!schedule) return;
        // Keep the user's choice across refetches; otherwise default to finalized > recommended > first
        setSelectedCandidate((prev) =>
            prev && schedule.candidates.some((c) => String(c.id) === prev)
                ? prev
                : String(schedule.finalized_candidate ?? summary?.recommended_candidate?.candidate_id ?? schedule.candidates[0]?.id ?? '')
        );
    }, [schedule, summary]);

    // The signed-in creator needs no key (docs/11_integration.md §2.1); everyone else needs a verified key.
    // Legacy events without an edit key can only be managed by their owner.
    const editKey = storedKey;
    const authenticated = Boolean(schedule?.is_owner) || storedKey !== undefined;

    const onAuthError = (err: Error) => {
        if (isAuthError(err)) {
            clearKey(uuid);
            toast({ title: t('edit.toast.reenterKey'), status: 'warning', duration: 3000 });
            return true;
        }
        return false;
    };

    const showError = (err: Error) => {
        if (!onAuthError(err)) toast({ title: err.message, status: 'error', duration: 4000 });
    };

    const handleFinalize = (candidateId: number | null) => {
        if (!authenticated) return;
        finalize.mutate(
            { candidateId, editKey },
            {
                onSuccess: () =>
                    toast({
                        title: candidateId ? t('edit.finalize.done') : t('edit.finalize.undone'),
                        status: 'success',
                        duration: 2500,
                    }),
                onError: showError,
            }
        );
    };

    const handleClose = () =>
        closeSchedule.mutate(editKey, {
            onSuccess: () => toast({ title: t('edit.closing.closedToast'), status: 'success', duration: 2500 }),
            onError: showError,
        });

    const handleReopen = () =>
        reopenSchedule.mutate(editKey, {
            onSuccess: () => toast({ title: t('edit.closing.reopenedToast'), status: 'success', duration: 2500 }),
            onError: showError,
        });

    const handleDelete = () => {
        if (!authenticated) return;
        deleteSchedule.mutate(editKey, {
            onSuccess: () => {
                clearKey(uuid);
                toast({ title: t('edit.danger.deleted'), status: 'success', duration: 3000 });
                router.push('/');
            },
            onError: (err) => {
                deleteDialog.onClose();
                showError(err);
            },
        });
    };

    if (isLoading || !hydrated) {
        return (
            <Container maxW="container.md" py={8}>
                <Skeleton h="400px" borderRadius="xl" />
            </Container>
        );
    }

    if (error || !schedule) {
        return (
            <Container maxW="container.md" py={16}>
                <Alert status="warning" borderRadius="xl">
                    <AlertIcon />
                    {t('edit.notFound')}
                </Alert>
            </Container>
        );
    }

    const status = getDetailStatus(schedule);
    const finalizedCandidate = schedule.candidates.find((c) => c.id === schedule.finalized_candidate);
    const meetingUrl = safeMeetingUrl(schedule.meeting_url);

    return (
        <Container maxW="container.md" py={{ base: 6, md: 8 }}>
            <VStack align="stretch" spacing={6}>
                <Box>
                    <Button as={NextLink} href={`/event/${uuid}`} variant="link" leftIcon={<ArrowLeft size={16} />} mb={3}>
                        {t('edit.back')}
                    </Button>
                    <HStack spacing={3} flexWrap="wrap">
                        <Heading as="h1" size="lg">
                            {t('edit.title')}
                        </Heading>
                        <StatusPill status={status} />
                    </HStack>
                    <Text color="text.muted" mt={1}>
                        {schedule.name}
                    </Text>
                    {schedule.is_owner && storedKey === undefined && (
                        <Text fontSize="sm" color="text.muted" mt={2} data-testid="owner-notice">
                            {t('edit.ownerNotice')}
                        </Text>
                    )}
                </Box>

                {authenticated && (
                    <>
                        <SectionCard title={t('edit.info.title')}>
                            <EventInfoForm schedule={schedule} editKey={editKey} onAuthError={onAuthError} />
                        </SectionCard>

                        <SectionCard title={t('edit.candidates.title')}>
                            <CandidateManager uuid={uuid} candidates={schedule.candidates} editKey={editKey} onAuthError={onAuthError} />
                        </SectionCard>

                        <SectionCard title={t('edit.closing.title')} testId="closing-section">
                            {status === 'fixed' ? (
                                <Text fontSize="sm" color="text.muted">
                                    {t('edit.closing.finalized')}
                                </Text>
                            ) : schedule.is_closed ? (
                                <VStack align="stretch" spacing={3}>
                                    <Text fontSize="sm">
                                        {schedule.closed_at
                                            ? t('edit.closing.closedAt', { date: formatDateTime(schedule.closed_at) })
                                            : t('edit.closing.closed')}
                                    </Text>
                                    {schedule.is_expired && (
                                        <Text fontSize="sm" color="text.muted">
                                            {t('edit.closing.expiredNote')}
                                        </Text>
                                    )}
                                    <Button
                                        alignSelf="end"
                                        variant="outline"
                                        leftIcon={<LockOpen size={16} />}
                                        onClick={handleReopen}
                                        isLoading={reopenSchedule.isPending}
                                    >
                                        {t('edit.closing.reopen')}
                                    </Button>
                                </VStack>
                            ) : (
                                <VStack align="stretch" spacing={3}>
                                    <Text fontSize="sm">
                                        {schedule.is_expired ? t('edit.closing.expired') : t('edit.closing.open')}
                                    </Text>
                                    <Text fontSize="sm" color="text.muted">
                                        {t('edit.closing.help')}
                                    </Text>
                                    <Button
                                        alignSelf="end"
                                        colorScheme="orange"
                                        variant="outline"
                                        leftIcon={<Lock size={16} />}
                                        onClick={handleClose}
                                        isLoading={closeSchedule.isPending}
                                    >
                                        {t('edit.closing.close')}
                                    </Button>
                                </VStack>
                            )}
                        </SectionCard>

                        <SectionCard title={t('edit.finalize.title')}>
                            {schedule.is_finalized && finalizedCandidate && (
                                <Alert status="success" borderRadius="md" mb={4}>
                                    <AlertIcon />
                                    {t('edit.finalize.current', {
                                        date: formatDateRange(finalizedCandidate.start_at, finalizedCandidate.end_at),
                                    })}
                                </Alert>
                            )}
                            {meetingUrl && (
                                <Box mb={4} p={3} borderRadius="md" bg="bg.subtle" data-testid="meeting-url">
                                    <Text fontSize="sm" fontWeight="semibold">
                                        {t('edit.finalize.meetingUrl')}
                                    </Text>
                                    <Link href={meetingUrl} isExternal color="brand.fg" fontSize="sm" wordBreak="break-all">
                                        {meetingUrl} <ExternalLink size={12} style={{ display: 'inline' }} aria-hidden />
                                    </Link>
                                </Box>
                            )}
                            <Text fontSize="sm" color="text.muted" mb={3}>
                                {t('edit.finalize.help')}
                            </Text>
                            <RadioGroup value={selectedCandidate} onChange={setSelectedCandidate}>
                                <VStack align="stretch" spacing={2}>
                                    {schedule.candidates.map((candidate) => (
                                        <Radio key={candidate.id} value={String(candidate.id)}>
                                            <HStack spacing={2} flexWrap="wrap">
                                                <Text>{formatDateRange(candidate.start_at, candidate.end_at)}</Text>
                                                <Text
                                                    fontSize="sm"
                                                    color="text.muted"
                                                    aria-label={t('edit.finalize.countsLabel', {
                                                        ok: candidate.ok_count,
                                                        maybe: candidate.maybe_count,
                                                        ng: candidate.ng_count,
                                                    })}
                                                >
                                                    {symbols.yes}
                                                    {candidate.ok_count} {symbols.maybe}
                                                    {candidate.maybe_count} {symbols.no}
                                                    {candidate.ng_count}
                                                </Text>
                                                {summary?.recommended_candidate?.candidate_id === candidate.id && (
                                                    <Badge colorScheme="green">{t('edit.finalize.recommended')}</Badge>
                                                )}
                                            </HStack>
                                        </Radio>
                                    ))}
                                </VStack>
                            </RadioGroup>
                            <HStack justify="end" mt={4} spacing={3} flexWrap="wrap">
                                {schedule.is_finalized && (
                                    <Button variant="outline" colorScheme="gray" onClick={() => handleFinalize(null)} isLoading={finalize.isPending}>
                                        {t('edit.finalize.undo')}
                                    </Button>
                                )}
                                <Button
                                    colorScheme="green"
                                    leftIcon={<CheckCircle2 size={16} />}
                                    onClick={() => handleFinalize(Number(selectedCandidate))}
                                    isDisabled={!selectedCandidate || Number(selectedCandidate) === schedule.finalized_candidate}
                                    isLoading={finalize.isPending}
                                >
                                    {t('edit.finalize.submit')}
                                </Button>
                            </HStack>
                        </SectionCard>

                        <SectionCard title={t('edit.danger.title')} tone="danger">
                            <Text fontSize="sm" color="text.muted" mb={4}>
                                {t('edit.danger.help')}
                            </Text>
                            <Button colorScheme="red" variant="outline" leftIcon={<Trash2 size={16} />} onClick={deleteDialog.onOpen}>
                                {t('edit.danger.delete')}
                            </Button>
                        </SectionCard>
                    </>
                )}
            </VStack>

            <EditKeyModal
                uuid={uuid}
                isOpen={!authenticated}
                onVerified={(key) => setKey(uuid, key)}
                onCancel={() => router.push(`/event/${uuid}`)}
            />

            <AlertDialog isOpen={deleteDialog.isOpen} leastDestructiveRef={cancelRef} onClose={deleteDialog.onClose} isCentered>
                <AlertDialogOverlay>
                    <AlertDialogContent mx={4}>
                        <AlertDialogHeader>{t('edit.danger.confirmTitle')}</AlertDialogHeader>
                        <AlertDialogBody>
                            {t('edit.danger.confirmBody', { name: schedule.name, count: schedule.participants.length })}
                        </AlertDialogBody>
                        <AlertDialogFooter gap={2}>
                            <Button ref={cancelRef} variant="ghost" colorScheme="gray" onClick={deleteDialog.onClose}>
                                {t('common.cancel')}
                            </Button>
                            <Button colorScheme="red" onClick={handleDelete} isLoading={deleteSchedule.isPending}>
                                {t('edit.danger.confirmDelete')}
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Container>
    );
}
