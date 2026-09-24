'use client';

import { useRef, useState } from 'react';
import {
    AlertDialog,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    Badge,
    Box,
    Button,
    Flex,
    FormControl,
    FormErrorMessage,
    FormLabel,
    HStack,
    IconButton,
    Input,
    Stack,
    Text,
    VStack,
    useDisclosure,
    useToast,
} from '@chakra-ui/react';
import { Plus, Trash2 } from 'lucide-react';
import { useAddCandidate, useDeleteCandidate } from '@/hooks/useApi';
import { formatDateRange, minutesBetween } from '@/lib/date';
import { useI18n } from '@/providers/I18nProvider';
import type { Candidate } from '@/types';

interface CandidateManagerProps {
    uuid: string;
    candidates: Candidate[];
    /** undefined when the signed-in owner manages the event without a key */
    editKey?: string;
    onAuthError: (error: Error) => boolean;
}

function responseCount(candidate: Candidate) {
    return candidate.ok_count + candidate.maybe_count + candidate.ng_count;
}

export function CandidateManager({ uuid, candidates, editKey, onAuthError }: CandidateManagerProps) {
    const toast = useToast();
    const { t } = useI18n();
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('10:00');
    const [endTime, setEndTime] = useState('11:00');
    const [formError, setFormError] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<Candidate | null>(null);
    const confirm = useDisclosure();
    const cancelRef = useRef<HTMLButtonElement>(null);

    const addCandidate = useAddCandidate(uuid);
    const deleteCandidate = useDeleteCandidate(uuid);

    const handleError = (error: Error) => {
        if (!onAuthError(error)) {
            toast({ title: error.message, status: 'error', duration: 4000, isClosable: true });
        }
    };

    const handleAdd = () => {
        if (!date) {
            setFormError(t('edit.candidates.dateRequired'));
            return;
        }
        if (minutesBetween(startTime, endTime) <= 0) {
            setFormError(t('edit.candidates.endAfterStart'));
            return;
        }
        setFormError(null);
        addCandidate.mutate(
            {
                candidate: {
                    start_at: new Date(`${date}T${startTime}`).toISOString(),
                    end_at: new Date(`${date}T${endTime}`).toISOString(),
                },
                editKey,
            },
            {
                onSuccess: () => {
                    toast({ title: t('edit.candidates.added'), status: 'success', duration: 2000 });
                    setDate('');
                },
                onError: handleError,
            }
        );
    };

    const runDelete = (candidate: Candidate) => {
        deleteCandidate.mutate(
            { candidateId: candidate.id, editKey },
            {
                onSuccess: () => toast({ title: t('edit.candidates.deleted'), status: 'success', duration: 2000 }),
                onError: handleError,
                onSettled: () => {
                    setPendingDelete(null);
                    confirm.onClose();
                },
            }
        );
    };

    const requestDelete = (candidate: Candidate) => {
        if (responseCount(candidate) > 0) {
            // Confirm before discarding existing answers
            setPendingDelete(candidate);
            confirm.onOpen();
        } else {
            runDelete(candidate);
        }
    };

    return (
        <VStack align="stretch" spacing={4}>
            <VStack as="ul" align="stretch" spacing={2} listStyleType="none" aria-label={t('edit.candidates.listLabel')}>
                {candidates.map((candidate) => (
                    <Flex
                        as="li"
                        key={candidate.id}
                        p={3}
                        borderRadius="lg"
                        bg="bg.subtle"
                        align="center"
                        justify="space-between"
                        gap={2}
                        data-testid="manage-candidate"
                    >
                        <Box>
                            <Text fontWeight="medium">{formatDateRange(candidate.start_at, candidate.end_at)}</Text>
                            <Badge mt={1} colorScheme={responseCount(candidate) > 0 ? 'blue' : 'gray'}>
                                {t('edit.candidates.responseCount', { count: responseCount(candidate) })}
                            </Badge>
                        </Box>
                        <IconButton
                            aria-label={t('edit.candidates.deleteLabel', { date: formatDateRange(candidate.start_at, candidate.end_at) })}
                            icon={<Trash2 size={16} />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            isDisabled={candidates.length <= 1}
                            isLoading={deleteCandidate.isPending && deleteCandidate.variables?.candidateId === candidate.id}
                            onClick={() => requestDelete(candidate)}
                        />
                    </Flex>
                ))}
            </VStack>
            {candidates.length <= 1 && (
                <Text fontSize="xs" color="text.muted">
                    {t('edit.candidates.minOne')}
                </Text>
            )}

            <Box p={4} borderRadius="lg" border="2px dashed" borderColor="border.default">
                <Text fontWeight="semibold" mb={3}>
                    {t('edit.candidates.addTitle')}
                </Text>
                <Stack direction={{ base: 'column', md: 'row' }} spacing={3} align={{ md: 'end' }}>
                    <FormControl isInvalid={!!formError} flex={2}>
                        <FormLabel fontSize="sm" htmlFor="new-candidate-date">
                            {t('edit.candidates.date')}
                        </FormLabel>
                        <Input id="new-candidate-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </FormControl>
                    <HStack flex={2} align="end">
                        <FormControl>
                            <FormLabel fontSize="sm" htmlFor="new-candidate-start">
                                {t('edit.candidates.start')}
                            </FormLabel>
                            <Input id="new-candidate-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                        </FormControl>
                        <FormControl>
                            <FormLabel fontSize="sm" htmlFor="new-candidate-end">
                                {t('edit.candidates.end')}
                            </FormLabel>
                            <Input id="new-candidate-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                        </FormControl>
                    </HStack>
                    <Button leftIcon={<Plus size={16} />} onClick={handleAdd} isLoading={addCandidate.isPending} flexShrink={0}>
                        {t('edit.candidates.add')}
                    </Button>
                </Stack>
                {formError && (
                    <FormControl isInvalid>
                        <FormErrorMessage>{formError}</FormErrorMessage>
                    </FormControl>
                )}
            </Box>

            <AlertDialog isOpen={confirm.isOpen} leastDestructiveRef={cancelRef} onClose={confirm.onClose} isCentered>
                <AlertDialogOverlay>
                    <AlertDialogContent mx={4}>
                        <AlertDialogHeader>{t('edit.candidates.confirmTitle')}</AlertDialogHeader>
                        <AlertDialogBody>
                            {pendingDelete && (
                                <>
                                    <Text fontWeight="medium">{formatDateRange(pendingDelete.start_at, pendingDelete.end_at)}</Text>
                                    <Text mt={2} color="text.muted">
                                        {t('edit.candidates.confirmBody', { count: responseCount(pendingDelete) })}
                                    </Text>
                                </>
                            )}
                        </AlertDialogBody>
                        <AlertDialogFooter gap={2}>
                            <Button ref={cancelRef} variant="ghost" colorScheme="gray" onClick={confirm.onClose}>
                                {t('common.cancel')}
                            </Button>
                            <Button
                                colorScheme="red"
                                isLoading={deleteCandidate.isPending}
                                onClick={() => pendingDelete && runDelete(pendingDelete)}
                            >
                                {t('edit.candidates.confirmDelete')}
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </VStack>
    );
}
