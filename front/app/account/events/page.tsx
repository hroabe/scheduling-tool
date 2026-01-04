'use client';

/**
 * My Events Page - List of user's owned schedules
 * RFC-0003: ユーザー認証/アカウント機能
 */

import { useEffect, useState } from 'react';
import {
    Box,
    Container,
    VStack,
    HStack,
    Heading,
    Text,
    Card,
    CardBody,
    Button,
    Badge,
    Spinner,
    Center,
    SimpleGrid,
    useToast,
    Alert,
    AlertIcon,
    Link as ChakraLink,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import type { ScheduleListItem } from '@/types';

export default function MyEventsPage() {
    const router = useRouter();
    const toast = useToast();
    const { isAuthenticated, user, checkAuth } = useAuthStore();
    const [schedules, setSchedules] = useState<ScheduleListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            // Check if user is authenticated
            if (!isAuthenticated) {
                await checkAuth();
            }
        };
        init();
    }, [isAuthenticated, checkAuth]);

    useEffect(() => {
        const loadSchedules = async () => {
            if (!isAuthenticated) {
                setIsLoading(false);
                return;
            }
            
            try {
                const response = await api.getMySchedules();
                setSchedules(response.results);
            } catch (error) {
                console.error('Failed to load schedules:', error);
                toast({
                    title: 'エラー',
                    description: 'イベントの読み込みに失敗しました',
                    status: 'error',
                    duration: 5000,
                });
            } finally {
                setIsLoading(false);
            }
        };
        
        loadSchedules();
    }, [isAuthenticated, toast]);

    if (isLoading) {
        return (
            <Center h="50vh">
                <Spinner size="xl" />
            </Center>
        );
    }

    if (!isAuthenticated) {
        return (
            <Container maxW="container.md" py={8}>
                <Alert status="warning">
                    <AlertIcon />
                    <VStack align="start" spacing={2}>
                        <Text>ログインが必要です</Text>
                        <Button
                            colorScheme="blue"
                            size="sm"
                            onClick={() => router.push('/account')}
                        >
                            ログインページへ
                        </Button>
                    </VStack>
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxW="container.lg" py={8}>
            <VStack spacing={6} align="stretch">
                <HStack justify="space-between">
                    <Heading size="lg">マイイベント</Heading>
                    <Button
                        colorScheme="blue"
                        onClick={() => router.push('/create')}
                    >
                        新規作成
                    </Button>
                </HStack>

                {schedules.length === 0 ? (
                    <Card>
                        <CardBody>
                            <Center py={8}>
                                <VStack spacing={4}>
                                    <Text color="gray.500">
                                        まだイベントがありません
                                    </Text>
                                    <Button
                                        colorScheme="blue"
                                        onClick={() => router.push('/create')}
                                    >
                                        イベントを作成
                                    </Button>
                                </VStack>
                            </Center>
                        </CardBody>
                    </Card>
                ) : (
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        {schedules.map((schedule) => (
                            <ScheduleCard key={schedule.id} schedule={schedule} />
                        ))}
                    </SimpleGrid>
                )}
            </VStack>
        </Container>
    );
}

function ScheduleCard({ schedule }: { schedule: ScheduleListItem }) {
    return (
        <Card
            as={Link}
            href={`/event/${schedule.uuid}`}
            _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
            transition="all 0.2s"
        >
            <CardBody>
                <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between">
                        <Heading size="sm" noOfLines={1}>
                            {schedule.name}
                        </Heading>
                        <HStack>
                            {schedule.is_finalized && (
                                <Badge colorScheme="green">確定</Badge>
                            )}
                            {!schedule.is_active && (
                                <Badge colorScheme="gray">無効</Badge>
                            )}
                        </HStack>
                    </HStack>

                    <HStack spacing={4} fontSize="sm" color="gray.600">
                        <Text>候補: {schedule.candidate_count}</Text>
                        <Text>回答: {schedule.participant_count}人</Text>
                    </HStack>

                    {schedule.deadline && (
                        <Text fontSize="sm" color="gray.500">
                            期限: {format(new Date(schedule.deadline), 'yyyy/MM/dd HH:mm', { locale: ja })}
                        </Text>
                    )}

                    <Text fontSize="xs" color="gray.400">
                        作成: {format(new Date(schedule.created_at), 'yyyy/MM/dd', { locale: ja })}
                    </Text>
                </VStack>
            </CardBody>
        </Card>
    );
}
