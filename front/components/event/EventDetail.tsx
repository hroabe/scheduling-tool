'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Badge,
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
    Tab,
    TabList,
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
    CalendarPlus,
    CheckCircle2,
    Clock,
    KeyRound,
    ExternalLink,
    FileSpreadsheet,
    Pencil,
    Share2,
    Users,
} from 'lucide-react';
import { CreatedModal } from './CreatedModal';
import { ResponseForm } from './ResponseForm';
import { ResponseSuccessModal } from './ResponseSuccessModal';
import { ResponseTable } from './ResponseTable';
import { SummaryChart } from './SummaryChart';
import { useExportUrls, useSchedule, useScheduleSummary } from '@/hooks/useApi';
import { ApiError } from '@/lib/api';
import { formatDateRange, formatDateTime, formatRelative, googleCalendarUrl } from '@/lib/date';
import { useEditKeyStore, useMyResponsesStore } from '@/stores';
import type { ParticipantWithToken } from '@/types';

function useShareUrl(uuid: string) {
    const [shareUrl, setShareUrl] = useState('');
    useEffect(() => {
        setShareUrl(`${window.location.origin}/event/${uuid}?utm_source=share&utm_medium=link`);
    }, [uuid]);
    return shareUrl;
}

export function EventDetail({ uuid }: { uuid: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState(0);
    const [lastWasUpdate, setLastWasUpdate] = useState(false);

    const { data: schedule, isLoading, error } = useSchedule(uuid);
    const { data: summary } = useScheduleSummary(uuid);
    const exportUrls = useExportUrls(uuid);
    const shareUrl = useShareUrl(uuid);
    const { hasCopied, onCopy } = useClipboard(shareUrl);

    const editKey = useEditKeyStore((state) => state.keys[uuid]);
    const myResponse = useMyResponsesStore((state) => state.responses[uuid]);
    const saveResponse = useMyResponsesStore((state) => state.saveResponse);

    const created = useDisclosure();
    const success = useDisclosure();

    // Show the "created" dialog once, then drop ?created=1 from the URL
    useEffect(() => {
        if (searchParams.get('created') === '1') {
            created.onOpen();
            router.replace(`/event/${uuid}`, { scroll: false });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const myParticipant = useMemo(
        () => (myResponse && schedule?.participants.find((p) => p.id === myResponse.participantId)) || null,
        [myResponse, schedule]
    );

    const finalizedCandidate = schedule?.candidates.find((c) => c.id === schedule.finalized_candidate);

    const handleShare = async () => {
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({ title: schedule?.name, text: `「${schedule?.name}」の日程調整にご回答ください`, url: shareUrl });
                return;
            } catch {
                // User cancelled or share failed; fall back to copying
            }
        }
        onCopy();
        toast({ title: 'URLをコピーしました', status: 'success', duration: 2000 });
    };

    const handleResponseSuccess = (participant: ParticipantWithToken, isUpdate: boolean) => {
        saveResponse(uuid, { participantId: participant.id, name: participant.name, editToken: participant.edit_token });
        setLastWasUpdate(isUpdate);
        setActiveTab(0);
        success.onOpen();
    };

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
                    <AlertTitle mt={4} mb={1} fontSize="lg">
                        {notFound ? 'イベントが見つかりませんでした' : 'イベントを読み込めませんでした'}
                    </AlertTitle>
                    <AlertDescription maxW="sm">
                        {notFound ? 'URLが正しいか、イベントが削除されていないかご確認ください。' : error?.message}
                    </AlertDescription>
                    <Button as={NextLink} href="/create" mt={6}>
                        新しくイベントを作成する
                    </Button>
                </Alert>
            </Container>
        );
    }

    const statusBadge = schedule.is_finalized ? (
        <Badge colorScheme="green">確定済み</Badge>
    ) : schedule.is_expired ? (
        <Badge colorScheme="red">回答期限切れ</Badge>
    ) : !schedule.is_active ? (
        <Badge colorScheme="gray">受付停止中</Badge>
    ) : (
        <Badge colorScheme="blue">回答受付中</Badge>
    );

    return (
        <Container maxW="container.xl" py={{ base: 6, md: 8 }}>
            <VStack spacing={6} align="stretch">
                {/* Event header */}
                <Box as="section" bg="bg.card" borderRadius="xl" border="1px solid" borderColor="border.default" p={{ base: 4, md: 6 }}>
                    <VStack spacing={4} align="stretch">
                        <Flex justify="space-between" align="start" wrap="wrap" gap={4}>
                            <VStack align="start" spacing={2} flex="1" minW="240px">
                                <HStack flexWrap="wrap">
                                    <Heading as="h1" size="lg" wordBreak="break-word">
                                        {schedule.name}
                                    </Heading>
                                    {statusBadge}
                                </HStack>
                                {schedule.description && (
                                    <Text color="text.muted" whiteSpace="pre-wrap">
                                        {schedule.description}
                                    </Text>
                                )}
                            </VStack>

                            <HStack spacing={2} flexWrap="wrap" className="no-print">
                                <Tooltip label={hasCopied ? 'コピーしました' : 'URLを共有'}>
                                    <Button
                                        leftIcon={hasCopied ? <CheckCircle2 size={16} /> : <Share2 size={16} />}
                                        size="sm"
                                        onClick={handleShare}
                                        aria-label="URLを共有"
                                    >
                                        共有
                                    </Button>
                                </Tooltip>
                                <Button
                                    as="a"
                                    href={exportUrls.csv}
                                    leftIcon={<FileSpreadsheet size={16} />}
                                    size="sm"
                                    variant="outline"
                                    aria-label="CSVでダウンロード"
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
                                    aria-label="ICSでカレンダーに追加"
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
                                    aria-label="イベントを編集"
                                    data-testid="edit-link"
                                >
                                    編集
                                </Button>
                            </HStack>
                        </Flex>

                        <Stack direction={{ base: 'column', sm: 'row' }} spacing={{ base: 1, sm: 6 }} flexWrap="wrap" color="text.muted" fontSize="sm">
                            <HStack>
                                <Icon as={Users} />
                                <Text>主催: {schedule.owner_name}</Text>
                            </HStack>
                            <HStack>
                                <Icon as={Users} />
                                <Text>回答: {schedule.participants.length}名</Text>
                            </HStack>
                            {schedule.deadline && (
                                <HStack>
                                    <Icon as={Clock} />
                                    <Text>期限: {formatDateTime(schedule.deadline)}</Text>
                                </HStack>
                            )}
                            <HStack>
                                <Icon as={Clock} />
                                <Text>作成: {formatRelative(schedule.created_at)}</Text>
                            </HStack>
                        </Stack>

                        {schedule.is_finalized && finalizedCandidate && (
                            <Alert status="success" borderRadius="lg" alignItems="start" data-testid="finalized-alert">
                                <AlertIcon />
                                <Box flex="1">
                                    <AlertTitle>日程が確定しました</AlertTitle>
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
                                                カレンダーに追加（ICS）
                                            </Button>
                                            <Link
                                                href={googleCalendarUrl({
                                                    title: schedule.name,
                                                    start: finalizedCandidate.start_at,
                                                    end: finalizedCandidate.end_at,
                                                    details: shareUrl ? `${schedule.description}\n\n${shareUrl.split('?')[0]}`.trim() : schedule.description,
                                                })}
                                                isExternal
                                                fontSize="sm"
                                                display="inline-flex"
                                                alignItems="center"
                                                gap={1}
                                            >
                                                Googleカレンダーに登録 <ExternalLink size={12} />
                                            </Link>
                                        </HStack>
                                    </AlertDescription>
                                </Box>
                            </Alert>
                        )}

                        {!schedule.is_finalized && schedule.deadline && schedule.can_respond && (
                            <Alert status="info" borderRadius="lg">
                                <AlertIcon />
                                回答期限: {formatDateTime(schedule.deadline)} まで
                            </Alert>
                        )}

                        {editKey !== undefined && (
                            <HStack fontSize="sm" color="text.muted" className="no-print">
                                <Icon as={KeyRound} />
                                <Text>
                                    このタブでは主催者として認証済みです。
                                    <Link as={NextLink} href={`/event/${uuid}/edit`} color="brand.fg">
                                        編集ページへ
                                    </Link>
                                </Text>
                            </HStack>
                        )}
                    </VStack>
                </Box>

                <Tabs index={activeTab} onChange={setActiveTab} variant="soft-rounded" colorScheme="brand" isLazy lazyBehavior="keepMounted">
                    <TabList gap={2} overflowX="auto" className="no-print">
                        <Tab>回答状況</Tab>
                        <Tab>{myParticipant ? '自分の回答を編集' : '回答する'}</Tab>
                        <Tab>集計結果</Tab>
                    </TabList>

                    <TabPanels>
                        <TabPanel px={0} pt={6}>
                            <ResponseTable
                                schedule={schedule}
                                recommendedId={summary?.recommended_candidate?.candidate_id}
                                myParticipantId={myParticipant?.id}
                            />
                            {schedule.can_respond && !myParticipant && (
                                <Flex justify="center" mt={6} className="no-print">
                                    <Button size="lg" onClick={() => setActiveTab(1)}>
                                        出欠を回答する
                                    </Button>
                                </Flex>
                            )}
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
                                <Alert status="info" borderRadius="xl">
                                    <AlertIcon />
                                    {schedule.is_finalized
                                        ? 'このイベントは日程が確定したため、回答を締め切りました'
                                        : schedule.is_expired
                                          ? '回答期限が過ぎているため、回答できません'
                                          : 'このイベントは現在回答を受け付けていません'}
                                </Alert>
                            )}
                        </TabPanel>

                        <TabPanel px={0} pt={6}>
                            <SummaryChart schedule={schedule} summary={summary} icsUrl={(id) => exportUrls.ics(id)} />
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </VStack>

            <CreatedModal isOpen={created.isOpen} onClose={created.onClose} shareUrl={shareUrl} editKey={editKey || undefined} />
            <ResponseSuccessModal isOpen={success.isOpen} onClose={success.onClose} isUpdate={lastWasUpdate} />
        </Container>
    );
}
