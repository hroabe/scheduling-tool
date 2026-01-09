'use client';

/**
 * My Events Page - List of user's owned schedules
 * RFC-0003: ユーザー認証/アカウント機能
 * UI Refresh v7: Enhanced design with search, filter, sort
 */

import { useEffect, useState, useMemo } from 'react';
import {
    Box,
    Container,
    VStack,
    HStack,
    Heading,
    Text,
    Button,
    Spinner,
    Center,
    SimpleGrid,
    useToast,
    Alert,
    AlertIcon,
    Input,
    InputGroup,
    InputLeftElement,
    Select,
    Flex,
    useColorModeValue,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { Search, Plus } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import type { ScheduleListItem } from '@/types';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { EventListCard } from '@/components/event/EventListCard';
import { StatusPill, type EventStatus } from '@/components/event/StatusPill';

type FilterStatus = 'all' | EventStatus;
type SortOption = 'newest' | 'oldest' | 'most-responses';

export default function MyEventsPage() {
    const router = useRouter();
    const toast = useToast();
    const { isAuthenticated, user, checkAuth } = useAuthStore();
    const [schedules, setSchedules] = useState<ScheduleListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter/Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [sortOption, setSortOption] = useState<SortOption>('newest');

    const pageBg = useColorModeValue('gray.50', 'gray.900');
    const subtitleColor = useColorModeValue('gray.600', 'gray.400');

    useEffect(() => {
        const init = async () => {
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

    // Filter and sort schedules
    const filteredSchedules = useMemo(() => {
        let result = [...schedules];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter((s) =>
                s.name.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (filterStatus !== 'all') {
            result = result.filter((s) => {
                if (filterStatus === 'finalized') return s.is_finalized;
                if (filterStatus === 'inactive') return !s.is_active;
                if (filterStatus === 'active') return s.is_active && !s.is_finalized;
                return true;
            });
        }

        // Sort
        result.sort((a, b) => {
            switch (sortOption) {
                case 'newest':
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                case 'oldest':
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case 'most-responses':
                    return b.participant_count - a.participant_count;
                default:
                    return 0;
            }
        });

        return result;
    }, [schedules, searchQuery, filterStatus, sortOption]);

    if (isLoading) {
        return (
            <Box minH="100vh" bg={pageBg}>
                <Header />
                <Center h="50vh">
                    <Spinner size="xl" />
                </Center>
                <Footer />
            </Box>
        );
    }

    if (!isAuthenticated) {
        return (
            <Box minH="100vh" bg={pageBg}>
                <Header />
                <Container maxW="container.md" py={8}>
                    <Alert status="warning" borderRadius="xl">
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
                <Footer />
            </Box>
        );
    }

    return (
        <Box minH="100vh" bg={pageBg}>
            <Header />
            <Container maxW="container.lg" py={8}>
                <VStack spacing={6} align="stretch">
                    {/* Page Header */}
                    <VStack align="start" spacing={1}>
                        <Heading size="lg">マイイベント</Heading>
                        <Text color={subtitleColor}>
                            作成したイベントを一覧で管理できます
                        </Text>
                    </VStack>

                    {/* Toolbar: Search, Filter, Sort, Create */}
                    <Flex
                        direction={{ base: 'column', md: 'row' }}
                        gap={4}
                        align={{ base: 'stretch', md: 'center' }}
                        flexWrap="wrap"
                    >
                        {/* Search */}
                        <InputGroup maxW={{ base: '100%', md: '300px' }}>
                            <InputLeftElement pointerEvents="none">
                                <Search size={18} color="gray" />
                            </InputLeftElement>
                            <Input
                                placeholder="イベント名で検索…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                bg={useColorModeValue('white', 'gray.800')}
                            />
                        </InputGroup>

                        {/* Filter chips */}
                        <HStack spacing={2} flexWrap="wrap">
                            {(['all', 'active', 'expired', 'finalized'] as FilterStatus[]).map((status) => (
                                <Button
                                    key={status}
                                    size="sm"
                                    variant={filterStatus === status ? 'solid' : 'outline'}
                                    colorScheme={filterStatus === status ? 'blue' : 'gray'}
                                    onClick={() => setFilterStatus(status)}
                                >
                                    {status === 'all' ? 'すべて' : 
                                     status === 'active' ? '受付中' :
                                     status === 'expired' ? '締切' : '確定'}
                                </Button>
                            ))}
                        </HStack>

                        {/* Sort */}
                        <Select
                            maxW={{ base: '100%', md: '180px' }}
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value as SortOption)}
                            bg={useColorModeValue('white', 'gray.800')}
                        >
                            <option value="newest">新しい順</option>
                            <option value="oldest">古い順</option>
                            <option value="most-responses">回答が多い順</option>
                        </Select>

                        {/* Create button */}
                        <Button
                            colorScheme="blue"
                            leftIcon={<Plus size={18} />}
                            onClick={() => router.push('/create')}
                            ml={{ md: 'auto' }}
                        >
                            新規作成
                        </Button>
                    </Flex>

                    {/* Event List */}
                    {filteredSchedules.length === 0 ? (
                        <Box
                            bg={useColorModeValue('white', 'gray.800')}
                            borderRadius="xl"
                            p={8}
                            textAlign="center"
                        >
                            <VStack spacing={4}>
                                <Text color="gray.500">
                                    {schedules.length === 0
                                        ? 'まだイベントがありません'
                                        : '条件に一致するイベントがありません'}
                                </Text>
                                {schedules.length === 0 && (
                                    <Button
                                        colorScheme="blue"
                                        onClick={() => router.push('/create')}
                                    >
                                        イベントを作成
                                    </Button>
                                )}
                            </VStack>
                        </Box>
                    ) : (
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                            {filteredSchedules.map((schedule) => (
                                <EventListCard key={schedule.id} schedule={schedule} />
                            ))}
                        </SimpleGrid>
                    )}
                </VStack>
            </Container>
            <Footer />
        </Box>
    );
}

