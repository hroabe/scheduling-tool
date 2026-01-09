'use client';

/**
 * ゲスト向け公開予約ページ
 * 空き枠を選択して予約を確定
 */

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Box,
    Container,
    VStack,
    HStack,
    Heading,
    Text,
    FormControl,
    FormLabel,
    FormErrorMessage,
    Input,
    Textarea,
    Button,
    Card,
    CardBody,
    CardHeader,
    useToast,
    useColorModeValue,
    Spinner,
    SimpleGrid,
    Flex,
    Icon,
    Avatar,
    Badge,
    Alert,
    AlertIcon,
    Divider,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { Calendar, Clock, User, Mail, MessageSquare, Check } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, isSameDay, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ReservationFormInput {
    guest_name: string;
    guest_email: string;
    guest_message: string;
}

interface Slot {
    id: number;
    start_at: string;
    end_at: string;
    is_available: boolean;
}

interface BookingPage {
    slug: string;
    title: string;
    description: string;
    organizer: string;
    timezone_name: string;
    duration_minutes: number;
    available_slots: Slot[];
}

export default function PublicBookingPage() {
    const params = useParams();
    const router = useRouter();
    const toast = useToast();
    const slug = params.slug as string;

    const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const selectedBg = useColorModeValue('blue.50', 'blue.900');

    // Fetch booking page data
    const { data: page, isLoading, error } = useQuery<BookingPage>({
        queryKey: ['booking', slug],
        queryFn: async () => {
            const res = await fetch(`/api/v1/oneonone/booking/${slug}/`);
            if (!res.ok) throw new Error('ページが見つかりません');
            return res.json();
        },
    });

    // Reserve mutation
    const reserveMutation = useMutation({
        mutationFn: async (data: ReservationFormInput & { slot: number }) => {
            const res = await fetch(`/api/v1/oneonone/booking/${slug}/reserve/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.slot?.[0] || err.error || '予約に失敗しました');
            }
            return res.json();
        },
        onSuccess: (data) => {
            router.push(`/booking/${slug}/done?rid=${data.booking.uuid}`);
        },
        onError: (error: Error) => {
            toast({
                title: 'エラー',
                description: error.message,
                status: 'error',
                duration: 5000,
            });
        },
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ReservationFormInput>();

    // Group slots by date
    const slotsByDate = useMemo(() => {
        if (!page?.available_slots) return {};
        return page.available_slots.reduce((acc, slot) => {
            const dateKey = format(new Date(slot.start_at), 'yyyy-MM-dd');
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(slot);
            return acc;
        }, {} as Record<string, Slot[]>);
    }, [page?.available_slots]);

    // Get unique dates for the date chips
    const availableDates = useMemo(() => {
        return Object.keys(slotsByDate).map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime());
    }, [slotsByDate]);

    // Get slots for selected date
    const slotsForSelectedDate = useMemo(() => {
        if (!selectedDate) return [];
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        return slotsByDate[dateKey] || [];
    }, [selectedDate, slotsByDate]);

    const onSubmit = (data: ReservationFormInput) => {
        if (!selectedSlot) {
            toast({
                title: '時間を選択してください',
                status: 'warning',
                duration: 3000,
            });
            return;
        }
        reserveMutation.mutate({ ...data, slot: selectedSlot.id });
    };

    if (isLoading) {
        return (
            <Box minH="100vh">
                <Header />
                <Container maxW="container.lg" py={8}>
                    <Flex justify="center" align="center" minH="300px">
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
                    <Alert status="error" borderRadius="lg">
                        <AlertIcon />
                        予約ページが見つかりません
                    </Alert>
                </Container>
                <Footer />
            </Box>
        );
    }

    return (
        <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
            <Header />
            <Container maxW="container.xl" py={8}>
                <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
                    {/* Left Column - Calendar/Date Selection */}
                    <Card bg={cardBg} border="1px solid" borderColor={borderColor}>
                        <CardHeader>
                            <VStack align="start" spacing={2}>
                                <HStack>
                                    <Avatar name={page.organizer} size="sm" />
                                    <Text fontWeight="medium">{page.organizer}</Text>
                                </HStack>
                                <Heading size="lg">{page.title}</Heading>
                                {page.description && (
                                    <Text color="gray.600">{page.description}</Text>
                                )}
                                <HStack spacing={4} color="gray.500" fontSize="sm">
                                    <HStack>
                                        <Clock size={14} />
                                        <Text>{page.duration_minutes}分</Text>
                                    </HStack>
                                    <Text>タイムゾーン: {page.timezone_name}</Text>
                                </HStack>
                            </VStack>
                        </CardHeader>
                        <CardBody>
                            <VStack spacing={4} align="stretch">
                                <Text fontWeight="medium" fontSize="sm">
                                    <Icon as={Calendar} mr={1} />
                                    日付を選択
                                </Text>
                                {availableDates.length === 0 ? (
                                    <Alert status="info" borderRadius="md">
                                        <AlertIcon />
                                        現在予約可能な枠がありません
                                    </Alert>
                                ) : (
                                    <Flex wrap="wrap" gap={2}>
                                        {availableDates.map(date => (
                                            <Button
                                                key={date.toISOString()}
                                                size="sm"
                                                variant={selectedDate && isSameDay(selectedDate, date) ? 'solid' : 'outline'}
                                                colorScheme={selectedDate && isSameDay(selectedDate, date) ? 'blue' : 'gray'}
                                                onClick={() => {
                                                    setSelectedDate(date);
                                                    setSelectedSlot(null);
                                                }}
                                            >
                                                {format(date, 'M/d(E)', { locale: ja })}
                                            </Button>
                                        ))}
                                    </Flex>
                                )}
                            </VStack>
                        </CardBody>
                    </Card>

                    {/* Middle Column - Time Slots */}
                    <Card bg={cardBg} border="1px solid" borderColor={borderColor}>
                        <CardHeader>
                            <Heading size="md">
                                {selectedDate
                                    ? format(selectedDate, 'M月d日 (E)', { locale: ja })
                                    : '時間を選択'}
                            </Heading>
                        </CardHeader>
                        <CardBody>
                            {!selectedDate ? (
                                <VStack py={8}>
                                    <Icon as={Calendar} boxSize={10} color="gray.300" />
                                    <Text color="gray.500">日付を選択してください</Text>
                                </VStack>
                            ) : slotsForSelectedDate.length === 0 ? (
                                <Alert status="warning" borderRadius="md">
                                    <AlertIcon />
                                    この日は空き枠がありません
                                </Alert>
                            ) : (
                                <SimpleGrid columns={3} spacing={2}>
                                    {slotsForSelectedDate.map(slot => (
                                        <Button
                                            key={slot.id}
                                            size="md"
                                            variant={selectedSlot?.id === slot.id ? 'solid' : 'outline'}
                                            colorScheme={selectedSlot?.id === slot.id ? 'blue' : 'gray'}
                                            isDisabled={!slot.is_available}
                                            onClick={() => setSelectedSlot(slot)}
                                        >
                                            {format(new Date(slot.start_at), 'HH:mm')}
                                        </Button>
                                    ))}
                                </SimpleGrid>
                            )}
                        </CardBody>
                    </Card>

                    {/* Right Column - Reservation Form */}
                    <Card bg={cardBg} border="1px solid" borderColor={borderColor}>
                        <CardHeader>
                            <Heading size="md">予約</Heading>
                        </CardHeader>
                        <CardBody>
                            <form onSubmit={handleSubmit(onSubmit)}>
                                <VStack spacing={4}>
                                    {selectedSlot && (
                                        <Card w="full" bg={selectedBg} border="1px solid" borderColor="blue.200">
                                            <CardBody py={3}>
                                                <HStack>
                                                    <Icon as={Check} color="blue.500" />
                                                    <Text fontWeight="medium">
                                                        {format(new Date(selectedSlot.start_at), 'M月d日 (E) HH:mm', { locale: ja })}
                                                        <Text as="span" color="gray.500"> 〜 </Text>
                                                        {format(new Date(selectedSlot.end_at), 'HH:mm')}
                                                    </Text>
                                                </HStack>
                                            </CardBody>
                                        </Card>
                                    )}

                                    <FormControl isInvalid={!!errors.guest_name} isRequired>
                                        <FormLabel>
                                            <Icon as={User} mr={1} boxSize={4} />
                                            お名前
                                        </FormLabel>
                                        <Input
                                            {...register('guest_name', { required: 'お名前は必須です' })}
                                            placeholder="山田 太郎"
                                            isDisabled={!selectedSlot}
                                        />
                                        <FormErrorMessage>{errors.guest_name?.message}</FormErrorMessage>
                                    </FormControl>

                                    <FormControl isInvalid={!!errors.guest_email} isRequired>
                                        <FormLabel>
                                            <Icon as={Mail} mr={1} boxSize={4} />
                                            メールアドレス
                                        </FormLabel>
                                        <Input
                                            type="email"
                                            {...register('guest_email', {
                                                required: 'メールアドレスは必須です',
                                                pattern: {
                                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                    message: '有効なメールアドレスを入力してください',
                                                },
                                            })}
                                            placeholder="example@email.com"
                                            isDisabled={!selectedSlot}
                                        />
                                        <FormErrorMessage>{errors.guest_email?.message}</FormErrorMessage>
                                    </FormControl>

                                    <FormControl>
                                        <FormLabel>
                                            <Icon as={MessageSquare} mr={1} boxSize={4} />
                                            メッセージ（任意）
                                        </FormLabel>
                                        <Textarea
                                            {...register('guest_message')}
                                            placeholder="ご質問やご要望があればご記入ください"
                                            rows={3}
                                            isDisabled={!selectedSlot}
                                        />
                                    </FormControl>

                                    <Divider />

                                    <Button
                                        type="submit"
                                        colorScheme="blue"
                                        size="lg"
                                        w="full"
                                        isLoading={reserveMutation.isPending}
                                        isDisabled={!selectedSlot}
                                    >
                                        この枠で予約する
                                    </Button>
                                </VStack>
                            </form>
                        </CardBody>
                    </Card>
                </SimpleGrid>
            </Container>
            <Footer />
        </Box>
    );
}
