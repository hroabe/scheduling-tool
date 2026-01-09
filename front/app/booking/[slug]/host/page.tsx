'use client';

/**
 * 主催者管理ページ
 * hostToken認証で空き枠管理・予約確認
 */

import { useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
    Box,
    Container,
    VStack,
    HStack,
    Heading,
    Text,
    Button,
    Card,
    CardBody,
    CardHeader,
    useToast,
    useColorModeValue,
    IconButton,
    Badge,
    Divider,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Icon,
    Flex,
    Alert,
    AlertIcon,
    Spinner,
    SimpleGrid,
    Input,
    Select,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
} from '@chakra-ui/react';
import { Calendar, Clock, Plus, Trash2, ExternalLink, Copy, Check, Users, Link as LinkIcon } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addMinutes, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function BookingHostPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const toast = useToast();
    const queryClient = useQueryClient();

    const slug = params.slug as string;
    const hostToken = searchParams.get('token');

    const [copied, setCopied] = useState(false);
    const [newSlotDate, setNewSlotDate] = useState('');
    const [newSlotStartTime, setNewSlotStartTime] = useState('09:00');
    const [newSlotEndTime, setNewSlotEndTime] = useState('09:30');

    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    // Fetch page data
    const { data: page, isLoading, error } = useQuery({
        queryKey: ['booking-host', slug, hostToken],
        queryFn: async () => {
            if (!hostToken) throw new Error('トークンがありません');
            const res = await fetch(`/api/v1/oneonone/booking/${slug}/host/?token=${hostToken}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || '管理権限がありません');
            }
            return res.json();
        },
        enabled: !!hostToken,
    });

    // Add slots mutation
    const addSlotsMutation = useMutation({
        mutationFn: async (slots: { start_at: string; end_at: string }[]) => {
            const res = await fetch(`/api/v1/oneonone/booking/${slug}/host/slots/?token=${hostToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slots }),
            });
            if (!res.ok) throw new Error('追加に失敗しました');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['booking-host', slug] });
            toast({ title: '枠を追加しました', status: 'success', duration: 2000 });
            setNewSlotDate('');
        },
    });

    // Delete slot mutation
    const deleteSlotMutation = useMutation({
        mutationFn: async (slotId: number) => {
            const res = await fetch(`/api/v1/oneonone/booking/${slug}/host/slots/${slotId}/?token=${hostToken}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('削除に失敗しました');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['booking-host', slug] });
            toast({ title: '枠を削除しました', status: 'success', duration: 2000 });
        },
    });

    const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/booking/${slug}` : `/booking/${slug}`;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: 'URLをコピーしました', status: 'success', duration: 2000 });
    };

    const handleAddSlot = () => {
        if (!newSlotDate || !newSlotStartTime || !newSlotEndTime) {
            toast({ title: '日時を入力してください', status: 'warning', duration: 3000 });
            return;
        }
        const startAt = `${newSlotDate}T${newSlotStartTime}:00`;
        const endAt = `${newSlotDate}T${newSlotEndTime}:00`;
        addSlotsMutation.mutate([{ start_at: startAt, end_at: endAt }]);
    };

    if (!hostToken) {
        return (
            <Box minH="100vh">
                <Header />
                <Container maxW="container.lg" py={8}>
                    <Alert status="error">
                        <AlertIcon />
                        管理リンクが無効です
                    </Alert>
                </Container>
                <Footer />
            </Box>
        );
    }

    if (isLoading) {
        return (
            <Box minH="100vh">
                <Header />
                <Container maxW="container.lg" py={8}>
                    <Flex justify="center" py={16}>
                        <Spinner size="xl" color="blue.500" />
                    </Flex>
                </Container>
                <Footer />
            </Box>
        );
    }

    if (error || !page) {
        return (
            <Box minH="100vh">
                <Header />
                <Container maxW="container.lg" py={8}>
                    <Alert status="error">
                        <AlertIcon />
                        {(error as Error)?.message || '管理ページを取得できません'}
                    </Alert>
                </Container>
                <Footer />
            </Box>
        );
    }

    return (
        <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
            <Header />
            <Container maxW="container.lg" py={8}>
                <VStack spacing={6} align="stretch">
                    {/* Header */}
                    <VStack align="start" spacing={1}>
                        <Badge colorScheme={page.status === 'PUBLISHED' ? 'green' : 'yellow'}>
                            {page.status === 'PUBLISHED' ? '公開中' : page.status}
                        </Badge>
                        <Heading size="lg">{page.title}</Heading>
                        <Text color="gray.500">主催者: {page.organizer_name}</Text>
                    </VStack>

                    {/* Share Bar */}
                    <Card bg={cardBg} border="1px solid" borderColor={borderColor}>
                        <CardBody>
                            <VStack spacing={4} align="stretch">
                                <Text fontWeight="medium">ゲスト用URL</Text>
                                <HStack>
                                    <Input value={publicUrl} isReadOnly flex={1} />
                                    <IconButton
                                        aria-label="コピー"
                                        icon={copied ? <Check size={18} /> : <Copy size={18} />}
                                        colorScheme={copied ? 'green' : 'blue'}
                                        onClick={handleCopy}
                                    />
                                    <Button
                                        as="a"
                                        href={publicUrl}
                                        target="_blank"
                                        leftIcon={<ExternalLink size={16} />}
                                        variant="outline"
                                    >
                                        開く
                                    </Button>
                                </HStack>
                                <Alert status="info" borderRadius="md" fontSize="sm">
                                    <AlertIcon />
                                    管理リンクは主催者だけが使えるURLです。共有しないでください。
                                </Alert>
                            </VStack>
                        </CardBody>
                    </Card>

                    {/* Tabs */}
                    <Tabs colorScheme="blue">
                        <TabList>
                            <Tab>
                                <Icon as={Calendar} mr={2} />
                                空き枠 ({page.slots?.length || 0})
                            </Tab>
                            <Tab>
                                <Icon as={Users} mr={2} />
                                予約 ({page.bookings?.length || 0})
                            </Tab>
                        </TabList>

                        <TabPanels>
                            {/* Slots Tab */}
                            <TabPanel px={0}>
                                <VStack spacing={4} align="stretch">
                                    {/* Add Slot Form */}
                                    <Card bg={cardBg} border="1px solid" borderColor={borderColor}>
                                        <CardBody>
                                            <HStack wrap="wrap" gap={4}>
                                                <Input
                                                    type="date"
                                                    value={newSlotDate}
                                                    onChange={e => setNewSlotDate(e.target.value)}
                                                    w="auto"
                                                />
                                                <HStack>
                                                    <Input
                                                        type="time"
                                                        value={newSlotStartTime}
                                                        onChange={e => setNewSlotStartTime(e.target.value)}
                                                        w="auto"
                                                    />
                                                    <Text>〜</Text>
                                                    <Input
                                                        type="time"
                                                        value={newSlotEndTime}
                                                        onChange={e => setNewSlotEndTime(e.target.value)}
                                                        w="auto"
                                                    />
                                                </HStack>
                                                <Button
                                                    leftIcon={<Plus size={16} />}
                                                    colorScheme="blue"
                                                    onClick={handleAddSlot}
                                                    isLoading={addSlotsMutation.isPending}
                                                >
                                                    追加
                                                </Button>
                                            </HStack>
                                        </CardBody>
                                    </Card>

                                    {/* Slots Table */}
                                    {page.slots?.length === 0 ? (
                                        <Card bg={cardBg} border="2px dashed" borderColor={borderColor}>
                                            <CardBody py={8}>
                                                <VStack>
                                                    <Icon as={Calendar} boxSize={10} color="gray.400" />
                                                    <Text color="gray.500">空き枠がありません</Text>
                                                </VStack>
                                            </CardBody>
                                        </Card>
                                    ) : (
                                        <TableContainer>
                                            <Table variant="simple" bg={cardBg}>
                                                <Thead>
                                                    <Tr>
                                                        <Th>日時</Th>
                                                        <Th>時間</Th>
                                                        <Th>ステータス</Th>
                                                        <Th></Th>
                                                    </Tr>
                                                </Thead>
                                                <Tbody>
                                                    {page.slots?.map((slot: any) => (
                                                        <Tr key={slot.id}>
                                                            <Td>{format(new Date(slot.start_at), 'M/d (E)', { locale: ja })}</Td>
                                                            <Td>
                                                                {format(new Date(slot.start_at), 'HH:mm')} - {format(new Date(slot.end_at), 'HH:mm')}
                                                            </Td>
                                                            <Td>
                                                                <Badge colorScheme={slot.is_booked ? 'orange' : 'green'}>
                                                                    {slot.is_booked ? '予約済み' : '空き'}
                                                                </Badge>
                                                            </Td>
                                                            <Td>
                                                                {!slot.is_booked && (
                                                                    <IconButton
                                                                        aria-label="削除"
                                                                        icon={<Trash2 size={16} />}
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        colorScheme="red"
                                                                        onClick={() => deleteSlotMutation.mutate(slot.id)}
                                                                        isLoading={deleteSlotMutation.isPending}
                                                                    />
                                                                )}
                                                            </Td>
                                                        </Tr>
                                                    ))}
                                                </Tbody>
                                            </Table>
                                        </TableContainer>
                                    )}
                                </VStack>
                            </TabPanel>

                            {/* Bookings Tab */}
                            <TabPanel px={0}>
                                {page.bookings?.length === 0 ? (
                                    <Card bg={cardBg} border="2px dashed" borderColor={borderColor}>
                                        <CardBody py={8}>
                                            <VStack>
                                                <Icon as={Users} boxSize={10} color="gray.400" />
                                                <Text color="gray.500">予約がありません</Text>
                                            </VStack>
                                        </CardBody>
                                    </Card>
                                ) : (
                                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                        {page.bookings?.map((booking: any) => (
                                            <Card key={booking.uuid} bg={cardBg} border="1px solid" borderColor={borderColor}>
                                                <CardBody>
                                                    <VStack align="stretch" spacing={2}>
                                                        <HStack justify="space-between">
                                                            <Text fontWeight="bold">{booking.guest_name}</Text>
                                                            <Badge colorScheme={
                                                                booking.status === 'confirmed' ? 'green' :
                                                                booking.status === 'cancelled' ? 'red' : 'yellow'
                                                            }>
                                                                {booking.status_display}
                                                            </Badge>
                                                        </HStack>
                                                        <Text fontSize="sm" color="gray.500">{booking.guest_email}</Text>
                                                        {booking.slot_info && (
                                                            <HStack fontSize="sm">
                                                                <Icon as={Clock} boxSize={4} />
                                                                <Text>
                                                                    {format(new Date(booking.slot_info.start_at), 'M/d HH:mm', { locale: ja })}
                                                                </Text>
                                                            </HStack>
                                                        )}
                                                        {booking.guest_message && (
                                                            <Text fontSize="sm" color="gray.600" noOfLines={2}>
                                                                {booking.guest_message}
                                                            </Text>
                                                        )}
                                                    </VStack>
                                                </CardBody>
                                            </Card>
                                        ))}
                                    </SimpleGrid>
                                )}
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                </VStack>
            </Container>
            <Footer />
        </Box>
    );
}
