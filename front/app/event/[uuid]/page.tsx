'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
    Box,
    Container,
    VStack,
    HStack,
    Heading,
    Text,
    Button,
    Badge,
    useColorModeValue,
    useToast,
    Tabs,
    TabPanels,
    TabPanel,
    Skeleton,
    Alert,
    AlertIcon,
    Flex,
    Icon,
    IconButton,
    Tooltip,
    useClipboard,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
    useDisclosure,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import {
    Share2,
    Copy,
    Check,
    Download,
    Users,
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle2,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { ResponseTable } from '@/components/event/ResponseTable';
import { ResponseForm } from '@/components/event/ResponseForm';
import { SummaryChart } from '@/components/event/SummaryChart';
import { ReminderCard } from '@/components/event/ReminderCard';
import { CandidateSummarySection } from '@/components/event/CandidateSummarySection';
import { FixDecisionModal } from '@/components/event/FixDecisionModal';
import { SegmentedTabList, SegmentedTab } from '@/components/ui/SegmentedTabs';
import { useSchedule, useScheduleSummary, useExportCsv, useDeleteParticipant, useFinalizeSchedule } from '@/hooks/useApi';
import { formatDateTime, formatRelative, isDeadlinePassed } from '@/lib/date';
import { getStoredToken, getEditTokenForParticipant, removeStoredToken } from '@/lib/tokenStorage';
import type { Schedule, CandidateSummary } from '@/types';

const MotionBox = motion(Box);

export default function EventPage() {
    const params = useParams();
    const uuid = params.uuid as string;
    const toast = useToast();
    const [activeTab, setActiveTab] = useState(0);
    const [editingParticipant, setEditingParticipant] = useState<Schedule['participants'][0] | null>(null);
    const [deletingParticipant, setDeletingParticipant] = useState<Schedule['participants'][0] | null>(null);
    const [ownedParticipantId, setOwnedParticipantId] = useState<number | null>(null);
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
    const cancelRef = useRef<HTMLButtonElement>(null);

    const { data: schedule, isLoading, error, refetch } = useSchedule(uuid);
    const { data: summary } = useScheduleSummary(uuid);
    const exportCsv = useExportCsv(uuid);
    const deleteParticipant = useDeleteParticipant(uuid);
    const finalizeSchedule = useFinalizeSchedule(uuid);

    // Finalization modal state
    const [finalizingCandidateId, setFinalizingCandidateId] = useState<number | null>(null);
    const { isOpen: isFixOpen, onOpen: onFixOpen, onClose: onFixClose } = useDisclosure();

    // Check localStorage for owned participant token
    useEffect(() => {
        if (uuid) {
            const stored = getStoredToken(uuid);
            setOwnedParticipantId(stored?.participantId ?? null);
        }
    }, [uuid]);

    const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/event/${uuid}`
        : '';
    const { hasCopied, onCopy } = useClipboard(shareUrl);
    
    // Check if Web Share API is available (typically on mobile)
    const canShare = typeof navigator !== 'undefined' && !!navigator.share;

    const handleShare = async () => {
        if (canShare && schedule) {
            try {
                await navigator.share({
                    title: schedule.name,
                    text: `${schedule.name} - 日程調整に回答してください`,
                    url: shareUrl,
                });
            } catch (err) {
                // User cancelled or share failed, fall back to copy
                if ((err as Error).name !== 'AbortError') {
                    onCopy();
                }
            }
        } else {
            onCopy();
        }
    };

    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.400', 'gray.600');
    const pageBg = useColorModeValue('gray.50', 'gray.900');

    const statusBadge = useMemo(() => {
        if (!schedule) return null;

        if (schedule.is_finalized) {
            return <Badge colorScheme="green" fontSize="sm">確定済み</Badge>;
        }
        if (schedule.is_expired) {
            return <Badge colorScheme="red" fontSize="sm">期限切れ</Badge>;
        }
        if (!schedule.is_active) {
            return <Badge colorScheme="gray" fontSize="sm">非公開</Badge>;
        }
        return <Badge colorScheme="blue" fontSize="sm">回答受付中</Badge>;
    }, [schedule]);

    const handleExportCsv = () => {
        exportCsv.mutate(true);
        toast({
            title: 'CSV出力を開始しました',
            status: 'info',
            duration: 2000,
        });
    };

    if (isLoading) {
        return (
            <Box minH="100vh" bg={pageBg}>
                <Header />
                <Container maxW="container.xl" py={8}>
                    <VStack spacing={6} align="stretch">
                        <Skeleton height="100px" borderRadius="xl" />
                        <Skeleton height="400px" borderRadius="xl" />
                    </VStack>
                </Container>
            </Box>
        );
    }

    if (error || !schedule) {
        return (
            <Box minH="100vh" bg={pageBg}>
                <Header />
                <Container maxW="container.xl" py={8}>
                    <Alert status="error" borderRadius="xl">
                        <AlertIcon />
                        イベントが見つかりませんでした
                    </Alert>
                </Container>
            </Box>
        );
    }

    return (
        <Box minH="100vh" bg={pageBg}>
            <Header />

            <Container maxW="container.xl" py={8}>
                <VStack spacing={6} align="stretch">
                    {/* Event Header */}
                    <MotionBox
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Box
                            bg={cardBg}
                            borderRadius="xl"
                            border="1px solid"
                            borderColor={borderColor}
                            p={6}
                        >
                            <VStack spacing={4} align="stretch">
                                <Flex justify="space-between" align="start" flexWrap="wrap" gap={4}>
                                    <VStack align="start" spacing={2}>
                                        <HStack>
                                            <Heading size="lg">{schedule.name}</Heading>
                                            {statusBadge}
                                        </HStack>
                                        {schedule.description && (
                                            <Text color="gray.600">{schedule.description}</Text>
                                        )}
                                    </VStack>

                                    <HStack spacing={2}>
                                        <Tooltip label={canShare ? '共有' : (hasCopied ? 'コピーしました' : 'URLをコピー')}>
                                            <Button
                                                leftIcon={canShare ? <Share2 size={16} /> : (hasCopied ? <Check size={16} /> : <Copy size={16} />)}
                                                variant="outline"
                                                size="sm"
                                                onClick={handleShare}
                                            >
                                                {canShare ? '共有' : (hasCopied ? 'コピー済み' : 'URLをコピー')}
                                            </Button>
                                        </Tooltip>
                                        <Tooltip label="CSVでダウンロード">
                                            <IconButton
                                                aria-label="CSV出力"
                                                icon={<Download size={16} />}
                                                variant="outline"
                                                size="sm"
                                                onClick={handleExportCsv}
                                                isLoading={exportCsv.isPending}
                                            />
                                        </Tooltip>
                                    </HStack>
                                </Flex>

                                {/* Event Info */}
                                <HStack spacing={6} flexWrap="wrap" color="gray.600" fontSize="sm">
                                    <HStack>
                                        <Icon as={Users} />
                                        <Text>主催: {schedule.owner_name}</Text>
                                        {schedule.department && (
                                            <Text>({schedule.department})</Text>
                                        )}
                                    </HStack>
                                    <HStack>
                                        <Icon as={Calendar} />
                                        <Text>候補: {schedule.candidates.length}件</Text>
                                    </HStack>
                                    <HStack>
                                        <Icon as={Users} />
                                        <Text>回答: {schedule.participants.length}名</Text>
                                    </HStack>
                                    {schedule.deadline && (
                                        <HStack>
                                            <Icon as={Clock} />
                                            <Text>
                                                期限: {formatDateTime(schedule.deadline)}
                                                {isDeadlinePassed(schedule.deadline) && (
                                                    <Badge ml={2} colorScheme="red" fontSize="xs">期限切れ</Badge>
                                                )}
                                            </Text>
                                        </HStack>
                                    )}
                                    <HStack>
                                        <Icon as={Calendar} />
                                        <Text>作成: {formatRelative(schedule.created_at)}</Text>
                                    </HStack>
                                </HStack>

                                {/* Finalized notice - 確定日時帯（目立つ） */}
                                {schedule.is_finalized && schedule.finalized_candidate && (
                                    <Box
                                        bg="green.500"
                                        color="white"
                                        borderRadius="lg"
                                        p={4}
                                        mt={2}
                                    >
                                        <HStack spacing={3}>
                                            <CheckCircle2 size={24} />
                                            <Box>
                                                <Text fontWeight="bold" fontSize="md">
                                                    予定が確定しました
                                                </Text>
                                                <Text fontSize="sm" opacity={0.9}>
                                                    {schedule.candidates.find(c => c.id === schedule.finalized_candidate)
                                                        ? `${formatDateTime(schedule.candidates.find(c => c.id === schedule.finalized_candidate)!.start_at)} に実施します`
                                                        : ''}
                                                </Text>
                                            </Box>
                                        </HStack>
                                    </Box>
                                )}

                                {/* Deadline warning */}
                                {!schedule.is_finalized && schedule.deadline && !isDeadlinePassed(schedule.deadline) && (
                                    <Alert status="warning" borderRadius="lg">
                                        <AlertIcon as={AlertCircle} />
                                        回答期限: {formatDateTime(schedule.deadline)} まで
                                    </Alert>
                                )}
                            </VStack>
                        </Box>
                    </MotionBox>

                    {/* Main Content Tabs */}
                    <Tabs
                        index={activeTab}
                        onChange={setActiveTab}
                        variant="unstyled"
                    >
                        <SegmentedTabList>
                            <SegmentedTab>回答状況</SegmentedTab>
                            <SegmentedTab>回答する</SegmentedTab>
                            <SegmentedTab>集計結果</SegmentedTab>
                        </SegmentedTabList>

                        <TabPanels>
                            {/* Response Table Tab */}
                            <TabPanel p={0} pt={6}>
                                <MotionBox
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <VStack spacing={6} align="stretch">
                                        <ResponseTable
                                            schedule={schedule}
                                            ownedParticipantId={ownedParticipantId}
                                            onEdit={(participant) => {
                                                setEditingParticipant(participant);
                                                setActiveTab(1); // Switch to Response Form tab
                                            }}
                                            onDelete={(participant) => {
                                                setDeletingParticipant(participant);
                                                onDeleteOpen();
                                            }}
                                        />
                                        
                                        {/* Reminder Card */}
                                        {schedule.can_respond && schedule.participants.length < 10 && (
                                            <ReminderCard
                                                onRemind={() => {
                                                    // Copy share link as reminder action
                                                    onCopy();
                                                    toast({
                                                        title: 'URLをコピーしました',
                                                        description: '未回答者にURLを共有してリマインドできます',
                                                        status: 'success',
                                                        duration: 3000,
                                                    });
                                                }}
                                            />
                                        )}
                                    </VStack>
                                </MotionBox>
                            </TabPanel>

                            {/* Response Form Tab */}
                            <TabPanel p={0} pt={6}>
                                <MotionBox
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {schedule.can_respond || editingParticipant ? (
                                        <ResponseForm
                                            schedule={schedule}
                                            existingParticipant={editingParticipant || undefined}
                                            editToken={editingParticipant ? getEditTokenForParticipant(uuid, editingParticipant.id) || undefined : undefined}
                                            onSuccess={() => {
                                                setEditingParticipant(null);
                                                setActiveTab(0);
                                                // Re-check owned participant ID
                                                const stored = getStoredToken(uuid);
                                                setOwnedParticipantId(stored?.participantId ?? null);
                                                toast({
                                                    title: editingParticipant ? '回答を更新しました' : '回答を送信しました',
                                                    status: 'success',
                                                    duration: 3000,
                                                });
                                            }}
                                            onCancel={() => {
                                                setEditingParticipant(null);
                                                setActiveTab(0);
                                            }}
                                        />
                                    ) : (
                                        <Alert status="info" borderRadius="xl">
                                            <AlertIcon />
                                            {schedule.is_finalized
                                                ? 'このイベントは確定済みのため、回答できません'
                                                : schedule.is_expired
                                                    ? '回答期限が過ぎているため、回答できません'
                                                    : 'このイベントは現在回答を受け付けていません'}
                                        </Alert>
                                    )}
                                </MotionBox>
                            </TabPanel>

                            {/* Summary Tab */}
                            <TabPanel p={0} pt={6}>
                                <MotionBox
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <VStack spacing={6} align="stretch">
                                        {/* New Candidate Summary Section */}
                                        {summary && (
                                            <CandidateSummarySection
                                                schedule={schedule}
                                                candidates={summary.candidates}
                                                recommendedId={summary.recommended_candidate?.candidate_id}
                                                totalParticipants={summary.total_participants}
                                                isOrganizer={true} // TODO: Check edit key from URL
                                                onFinalize={(candidateId) => {
                                                    setFinalizingCandidateId(candidateId);
                                                    onFixOpen();
                                                }}
                                            />
                                        )}
                                        {/* Existing Summary Chart */}
                                        <SummaryChart schedule={schedule} summary={summary} />
                                    </VStack>
                                </MotionBox>
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                </VStack>
            </Container>

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                isOpen={isDeleteOpen}
                leastDestructiveRef={cancelRef}
                onClose={onDeleteClose}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            回答を削除
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            {deletingParticipant?.name} さんの回答を削除しますか？
                            この操作は取り消せません。
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={onDeleteClose}>
                                キャンセル
                            </Button>
                            <Button
                                colorScheme="red"
                                onClick={() => {
                                    if (deletingParticipant) {
                                        const token = getEditTokenForParticipant(uuid, deletingParticipant.id);
                                        deleteParticipant.mutate(
                                            { participantId: deletingParticipant.id, token: token || undefined },
                                            {
                                                onSuccess: () => {
                                                    // Remove stored token if we deleted our own response
                                                    if (ownedParticipantId === deletingParticipant.id) {
                                                        removeStoredToken(uuid);
                                                        setOwnedParticipantId(null);
                                                    }
                                                    toast({
                                                        title: '回答を削除しました',
                                                        status: 'success',
                                                        duration: 3000,
                                                    });
                                                    onDeleteClose();
                                                    setDeletingParticipant(null);
                                                },
                                                onError: () => {
                                                    toast({
                                                        title: '削除に失敗しました',
                                                        description: '削除権限がありません',
                                                        status: 'error',
                                                        duration: 3000,
                                                    });
                                                    onDeleteClose();
                                                },
                                            }
                                        );
                                    }
                                }}
                                ml={3}
                                isLoading={deleteParticipant.isPending}
                            >
                                削除
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>

            {/* Finalization Confirmation Modal */}
            <FixDecisionModal
                isOpen={isFixOpen}
                onClose={() => {
                    onFixClose();
                    setFinalizingCandidateId(null);
                }}
                candidate={summary?.candidates.find(c => c.candidate_id === finalizingCandidateId) || null}
                onConfirm={() => {
                    if (finalizingCandidateId) {
                        finalizeSchedule.mutate(
                            { candidateId: finalizingCandidateId },
                            {
                                onSuccess: () => {
                                    toast({
                                        title: '日程を確定しました',
                                        description: '参加者に確定をお知らせください',
                                        status: 'success',
                                        duration: 5000,
                                    });
                                    onFixClose();
                                    setFinalizingCandidateId(null);
                                    refetch();
                                },
                                onError: () => {
                                    toast({
                                        title: '確定に失敗しました',
                                        description: '権限がないか、エラーが発生しました',
                                        status: 'error',
                                        duration: 5000,
                                    });
                                },
                            }
                        );
                    }
                }}
                isLoading={finalizeSchedule.isPending}
            />
        </Box>
    );
}


