'use client';

import { useEffect, useRef, useState } from 'react';
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
import { ArrowLeft, CheckCircle2, Save, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CandidateManager } from './CandidateManager';
import { EditKeyModal } from './EditKeyModal';
import {
    useDeleteSchedule,
    useFinalizeSchedule,
    useSchedule,
    useScheduleSummary,
    useUpdateSchedule,
} from '@/hooks/useApi';
import { ApiError } from '@/lib/api';
import { formatDateRange, localInputToISO, toLocalDateTimeString } from '@/lib/date';
import { useEditKeyStore } from '@/stores';
import type { Schedule } from '@/types';

const infoSchema = z.object({
    name: z.string().trim().min(1, 'イベント名を入力してください').max(200, '200文字以内で入力してください'),
    description: z.string().max(2000, '2000文字以内で入力してください'),
    deadline: z.string(),
    isActive: z.boolean(),
    allowMaybe: z.boolean(),
});
type InfoValues = z.infer<typeof infoSchema>;

function isAuthError(error: unknown) {
    return (
        error instanceof ApiError &&
        (error.status === 403 || (error.status === 400 && Boolean(error.data && 'edit_key' in error.data)))
    );
}

function SectionCard({ title, children, tone }: { title: string; children: React.ReactNode; tone?: 'danger' }) {
    return (
        <Card borderColor={tone === 'danger' ? 'red.300' : undefined}>
            <CardBody>
                <Heading as="h2" size="md" mb={4} color={tone === 'danger' ? 'red.500' : undefined}>
                    {title}
                </Heading>
                {children}
            </CardBody>
        </Card>
    );
}

function EventInfoForm({ schedule, editKey, onAuthError }: { schedule: Schedule; editKey: string; onAuthError: (e: Error) => boolean }) {
    const toast = useToast();
    const update = useUpdateSchedule(schedule.uuid);
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
            setError('deadline', { message: '回答期限は未来の日時を指定してください' });
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
                    toast({ title: '変更を保存しました', status: 'success', duration: 2000 });
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
                    <FormLabel>イベント名</FormLabel>
                    <Input {...register('name')} />
                    <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={!!errors.description}>
                    <FormLabel>説明</FormLabel>
                    <Textarea {...register('description')} rows={3} />
                    <FormErrorMessage>{errors.description?.message}</FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={!!errors.deadline}>
                    <FormLabel>回答期限</FormLabel>
                    <Input type="datetime-local" {...register('deadline')} />
                    <FormErrorMessage>{errors.deadline?.message}</FormErrorMessage>
                </FormControl>
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel htmlFor="is-active" mb={0}>
                        回答を受け付ける
                    </FormLabel>
                    <Switch id="is-active" {...register('isActive')} />
                </FormControl>
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel htmlFor="edit-allow-maybe" mb={0}>
                        「△（調整可能）」を許可
                    </FormLabel>
                    <Switch id="edit-allow-maybe" {...register('allowMaybe')} />
                </FormControl>
                <Button type="submit" leftIcon={<Save size={16} />} isLoading={update.isPending} isDisabled={!isDirty} alignSelf="end">
                    変更を保存
                </Button>
            </VStack>
        </form>
    );
}

export function EditEventPage({ uuid }: { uuid: string }) {
    const router = useRouter();
    const toast = useToast();
    const storedKey = useEditKeyStore((state) => state.keys[uuid]);
    const setKey = useEditKeyStore((state) => state.setKey);
    const clearKey = useEditKeyStore((state) => state.clearKey);
    const [hydrated, setHydrated] = useState(false);

    const { data: schedule, isLoading, error } = useSchedule(uuid);
    const { data: summary } = useScheduleSummary(uuid);
    const finalize = useFinalizeSchedule(uuid);
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

    // Legacy events without an edit key can be edited with an empty key
    const editKey = storedKey ?? (schedule && !schedule.has_edit_key ? '' : undefined);
    const authenticated = editKey !== undefined;

    const onAuthError = (err: Error) => {
        if (isAuthError(err)) {
            clearKey(uuid);
            toast({ title: '編集キーを再入力してください', status: 'warning', duration: 3000 });
            return true;
        }
        return false;
    };

    const handleFinalize = (candidateId: number | null) => {
        if (editKey === undefined) return;
        finalize.mutate(
            { candidateId, editKey },
            {
                onSuccess: () =>
                    toast({
                        title: candidateId ? '日程を確定しました' : '日程の確定を解除しました',
                        status: 'success',
                        duration: 2500,
                    }),
                onError: (err) => {
                    if (!onAuthError(err)) toast({ title: err.message, status: 'error', duration: 4000 });
                },
            }
        );
    };

    const handleDelete = () => {
        if (editKey === undefined) return;
        deleteSchedule.mutate(editKey, {
            onSuccess: () => {
                clearKey(uuid);
                toast({ title: 'イベントを削除しました', status: 'success', duration: 3000 });
                router.push('/');
            },
            onError: (err) => {
                deleteDialog.onClose();
                if (!onAuthError(err)) toast({ title: err.message, status: 'error', duration: 4000 });
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
                    イベントが見つかりませんでした
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxW="container.md" py={{ base: 6, md: 8 }}>
            <VStack align="stretch" spacing={6}>
                <Box>
                    <Button as={NextLink} href={`/event/${uuid}`} variant="link" leftIcon={<ArrowLeft size={16} />} mb={3}>
                        イベントページに戻る
                    </Button>
                    <Heading as="h1" size="lg">
                        イベント編集
                    </Heading>
                    <Text color="text.muted" mt={1}>
                        {schedule.name}
                    </Text>
                </Box>

                {authenticated && (
                    <>
                        <SectionCard title="イベント情報">
                            <EventInfoForm schedule={schedule} editKey={editKey} onAuthError={onAuthError} />
                        </SectionCard>

                        <SectionCard title="候補日の管理">
                            <CandidateManager uuid={uuid} candidates={schedule.candidates} editKey={editKey} onAuthError={onAuthError} />
                        </SectionCard>

                        <SectionCard title="日程確定">
                            {schedule.is_finalized && (
                                <Alert status="success" borderRadius="md" mb={4}>
                                    <AlertIcon />
                                    確定済み: {formatDateRange(
                                        schedule.candidates.find((c) => c.id === schedule.finalized_candidate)?.start_at ?? '',
                                        schedule.candidates.find((c) => c.id === schedule.finalized_candidate)?.end_at ?? ''
                                    )}
                                </Alert>
                            )}
                            <Text fontSize="sm" color="text.muted" mb={3}>
                                確定する候補日を選択してください。確定すると回答の受付を終了します。
                            </Text>
                            <RadioGroup value={selectedCandidate} onChange={setSelectedCandidate}>
                                <VStack align="stretch" spacing={2}>
                                    {schedule.candidates.map((candidate) => (
                                        <Radio key={candidate.id} value={String(candidate.id)}>
                                            <HStack spacing={2} flexWrap="wrap">
                                                <Text>{formatDateRange(candidate.start_at, candidate.end_at)}</Text>
                                                <Text fontSize="sm" color="text.muted">
                                                    ◯{candidate.ok_count} △{candidate.maybe_count} ×{candidate.ng_count}
                                                </Text>
                                                {summary?.recommended_candidate?.candidate_id === candidate.id && (
                                                    <Badge colorScheme="green">おすすめ</Badge>
                                                )}
                                            </HStack>
                                        </Radio>
                                    ))}
                                </VStack>
                            </RadioGroup>
                            <HStack justify="end" mt={4} spacing={3}>
                                {schedule.is_finalized && (
                                    <Button variant="outline" colorScheme="gray" onClick={() => handleFinalize(null)} isLoading={finalize.isPending}>
                                        確定を解除
                                    </Button>
                                )}
                                <Button
                                    colorScheme="green"
                                    leftIcon={<CheckCircle2 size={16} />}
                                    onClick={() => handleFinalize(Number(selectedCandidate))}
                                    isDisabled={!selectedCandidate || Number(selectedCandidate) === schedule.finalized_candidate}
                                    isLoading={finalize.isPending}
                                >
                                    日程を確定する
                                </Button>
                            </HStack>
                        </SectionCard>

                        <SectionCard title="危険な操作" tone="danger">
                            <Text fontSize="sm" color="text.muted" mb={4}>
                                イベントを削除すると、すべての候補日と回答が完全に削除され、元に戻せません。
                            </Text>
                            <Button colorScheme="red" variant="outline" leftIcon={<Trash2 size={16} />} onClick={deleteDialog.onOpen}>
                                イベントを削除する
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
                        <AlertDialogHeader>イベントを削除しますか？</AlertDialogHeader>
                        <AlertDialogBody>
                            「{schedule.name}」と、{schedule.participants.length}件の回答が完全に削除されます。この操作は取り消せません。
                        </AlertDialogBody>
                        <AlertDialogFooter gap={2}>
                            <Button ref={cancelRef} variant="ghost" colorScheme="gray" onClick={deleteDialog.onClose}>
                                キャンセル
                            </Button>
                            <Button colorScheme="red" onClick={handleDelete} isLoading={deleteSchedule.isPending}>
                                削除する
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Container>
    );
}
