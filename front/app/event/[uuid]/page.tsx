'use client';

import { useState, useMemo } from 'react';
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
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Skeleton,
    Alert,
    AlertIcon,
    Flex,
    Icon,
    IconButton,
    Tooltip,
    useClipboard,
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
import { useSchedule, useScheduleSummary, useExportCsv } from '@/hooks/useApi';
import { formatDateTime, formatRelative, isDeadlinePassed } from '@/lib/date';

const MotionBox = motion(Box);

export default function EventPage() {
    const params = useParams();
    const uuid = params.uuid as string;
    const toast = useToast();
    const [activeTab, setActiveTab] = useState(0);

    const { data: schedule, isLoading, error } = useSchedule(uuid);
    const { data: summary } = useScheduleSummary(uuid);
    const exportCsv = useExportCsv(uuid);

    const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/event/${uuid}`
        : '';
    const { hasCopied, onCopy } = useClipboard(shareUrl);

    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

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
        exportCsv.mutate(true, {
            onSuccess: () => {
                toast({
                    title: 'CSVをダウンロードしました',
                    status: 'success',
                    duration: 2000,
                });
            },
            onError: () => {
                toast({
                    title: 'ダウンロードに失敗しました',
                    status: 'error',
                    duration: 3000,
                });
            },
        });
    };

    if (isLoading) {
        return (
            <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
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
            <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
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
        <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
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
                                        <Tooltip label={hasCopied ? 'コピーしました' : 'URLをコピー'}>
                                            <Button
                                                leftIcon={hasCopied ? <Check size={16} /> : <Copy size={16} />}
                                                variant="outline"
                                                size="sm"
                                                onClick={onCopy}
                                            >
                                                {hasCopied ? 'コピー済み' : 'URLをコピー'}
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

                                {/* Finalized notice */}
                                {schedule.is_finalized && schedule.finalized_candidate && (
                                    <Alert status="success" borderRadius="lg">
                                        <AlertIcon as={CheckCircle2} />
                                        <Box>
                                            <Text fontWeight="bold">日程が確定しました</Text>
                                            <Text fontSize="sm">
                                                {schedule.candidates.find(c => c.id === schedule.finalized_candidate)
                                                    ? formatDateTime(schedule.candidates.find(c => c.id === schedule.finalized_candidate)!.start_at)
                                                    : ''}
                                            </Text>
                                        </Box>
                                    </Alert>
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
                        variant="enclosed"
                        colorScheme="brand"
                    >
                        <TabList>
                            <Tab>回答状況</Tab>
                            <Tab>回答する</Tab>
                            <Tab>集計結果</Tab>
                        </TabList>

                        <TabPanels>
                            {/* Response Table Tab */}
                            <TabPanel p={0} pt={6}>
                                <MotionBox
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ResponseTable
                                        schedule={schedule}
                                        onRowClick={(participant) => {
                                            // Could open edit modal
                                        }}
                                    />
                                </MotionBox>
                            </TabPanel>

                            {/* Response Form Tab */}
                            <TabPanel p={0} pt={6}>
                                <MotionBox
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {schedule.can_respond ? (
                                        <ResponseForm
                                            schedule={schedule}
                                            onSuccess={() => {
                                                setActiveTab(0);
                                                toast({
                                                    title: '回答を送信しました',
                                                    status: 'success',
                                                    duration: 3000,
                                                });
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
                                    <SummaryChart schedule={schedule} summary={summary} />
                                </MotionBox>
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                </VStack>
            </Container>
        </Box>
    );
}
