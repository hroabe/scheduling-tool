'use client';

/**
 * 1on1予約ページ作成（ログイン不要）
 * 主催者が空き枠を設定して公開予約ページを作成
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
    Button,
    Card,
    CardBody,
    CardHeader,
    Select,
    SimpleGrid,
    useToast,
    useColorModeValue,
    IconButton,
    Badge,
    Divider,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    useDisclosure,
    Tabs,
    TabList,
    Tab,
    Icon,
    Flex,
    Tooltip,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { Calendar, Clock, Plus, Trash2, Mail, User, Link as LinkIcon, Copy, Check } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { format, addMinutes, parse, startOfDay, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';

interface BookingFormInput {
    title: string;
    organizer_name: string;
    organizer_email: string;
    duration_minutes: number;
}

interface Slot {
    id: string;
    date: Date;
    start_at: string;
    end_at: string;
}

export default function BookingNewPage() {
    const router = useRouter();
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    
    const [slots, setSlots] = useState<Slot[]>([]);
    const [selectedDates, setSelectedDates] = useState<Date[]>([]);
    const [slotStartTime, setSlotStartTime] = useState('09:00');
    const [slotEndTime, setSlotEndTime] = useState('17:00');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [verifyUrl, setVerifyUrl] = useState<string | null>(null);

    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<BookingFormInput>({
        defaultValues: {
            title: '',
            organizer_name: '',
            organizer_email: '',
            duration_minutes: 30,
        },
    });

    const duration = watch('duration_minutes');

    // Generate time options
    const timeOptions = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            timeOptions.push(time);
        }
    }

    // Generate slots based on selected dates and time range
    const generateSlots = useCallback(() => {
        if (selectedDates.length === 0) {
            toast({
                title: '日付を選択してください',
                status: 'warning',
                duration: 3000,
            });
            return;
        }

        const newSlots: Slot[] = [];
        const durationMins = Number(duration) || 30;
        
        selectedDates.forEach(date => {
            const baseDate = startOfDay(date);
            const startParts = slotStartTime.split(':').map(Number);
            const endParts = slotEndTime.split(':').map(Number);
            
            let currentStart = new Date(baseDate);
            currentStart.setHours(startParts[0], startParts[1], 0, 0);
            
            const dayEnd = new Date(baseDate);
            dayEnd.setHours(endParts[0], endParts[1], 0, 0);
            
            while (currentStart < dayEnd) {
                const currentEnd = addMinutes(currentStart, durationMins);
                if (currentEnd <= dayEnd) {
                    newSlots.push({
                        id: `${date.toISOString()}-${format(currentStart, 'HHmm')}`,
                        date: date,
                        start_at: currentStart.toISOString(),
                        end_at: currentEnd.toISOString(),
                    });
                }
                currentStart = currentEnd;
            }
        });

        // Add to existing slots (avoid duplicates)
        setSlots(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            const unique = newSlots.filter(s => !existingIds.has(s.id));
            return [...prev, ...unique].sort((a, b) => 
                new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
            );
        });

        setSelectedDates([]);
        toast({
            title: `${newSlots.length}件の枠を追加しました`,
            status: 'success',
            duration: 2000,
        });
    }, [selectedDates, slotStartTime, slotEndTime, duration, toast]);

    const removeSlot = (id: string) => {
        setSlots(prev => prev.filter(s => s.id !== id));
    };

    const onSubmit = async (data: BookingFormInput) => {
        if (slots.length === 0) {
            toast({
                title: '空き枠を追加してください',
                status: 'error',
                duration: 3000,
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/v1/oneonone/booking/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...data,
                    slots: slots.map(s => ({
                        start_at: s.start_at,
                        end_at: s.end_at,
                    })),
                }),
            });

            const result = await response.json();

            if (response.ok) {
                setVerifyUrl(result.verify_url);
                onOpen();
            } else {
                throw new Error(result.error || '作成に失敗しました');
            }
        } catch (error: any) {
            toast({
                title: 'エラー',
                description: error.message,
                status: 'error',
                duration: 5000,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Group slots by date for display
    const slotsByDate = slots.reduce((acc, slot) => {
        const dateKey = format(new Date(slot.start_at), 'yyyy-MM-dd');
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(slot);
        return acc;
    }, {} as Record<string, Slot[]>);

    // Simple date picker (inline calendar)
    const [currentMonth, setCurrentMonth] = useState(new Date());
    
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days: (Date | null)[] = [];
        
        // Add empty days for first week
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null);
        }
        
        // Add days
        for (let d = 1; d <= lastDay.getDate(); d++) {
            days.push(new Date(year, month, d));
        }
        
        return days;
    };

    const toggleDate = (date: Date) => {
        if (date < startOfDay(new Date())) return; // Don't allow past dates
        
        setSelectedDates(prev => {
            const exists = prev.some(d => isSameDay(d, date));
            if (exists) {
                return prev.filter(d => !isSameDay(d, date));
            }
            return [...prev, date];
        });
    };

    return (
        <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
            <Header />
            <Container maxW="container.xl" py={8}>
                <VStack spacing={6} align="stretch">
                    <HStack justify="space-between" wrap="wrap" gap={4}>
                        <VStack align="start" spacing={1}>
                            <Heading size="lg">1on1 予約を作成</Heading>
                            <Text color="gray.500">空き枠を公開して、ゲストから予約を受け付けます</Text>
                        </VStack>
                    </HStack>

                    <form onSubmit={handleSubmit(onSubmit)}>
                        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                            {/* Left Column - Form */}
                            <VStack spacing={6} align="stretch">
                                {/* Basic Info */}
                                <Card bg={cardBg} border="1px solid" borderColor={borderColor}>
                                    <CardHeader pb={2}>
                                        <Heading size="md">基本情報</Heading>
                                    </CardHeader>
                                    <CardBody>
                                        <VStack spacing={4}>
                                            <FormControl isInvalid={!!errors.title} isRequired>
                                                <FormLabel>予約タイトル</FormLabel>
                                                <Input
                                                    {...register('title', { required: 'タイトルは必須です' })}
                                                    placeholder="例：1on1面談"
                                                />
                                                <FormErrorMessage>{errors.title?.message}</FormErrorMessage>
                                            </FormControl>

                                            <FormControl isInvalid={!!errors.organizer_name} isRequired>
                                                <FormLabel>
                                                    <Icon as={User} mr={1} boxSize={4} />
                                                    主催者名
                                                </FormLabel>
                                                <Input
                                                    {...register('organizer_name', { required: '主催者名は必須です' })}
                                                    placeholder="例：山田 太郎"
                                                />
                                                <FormErrorMessage>{errors.organizer_name?.message}</FormErrorMessage>
                                            </FormControl>

                                            <FormControl isInvalid={!!errors.organizer_email} isRequired>
                                                <FormLabel>
                                                    <Icon as={Mail} mr={1} boxSize={4} />
                                                    主催者メールアドレス
                                                </FormLabel>
                                                <Input
                                                    type="email"
                                                    {...register('organizer_email', {
                                                        required: 'メールアドレスは必須です',
                                                        pattern: {
                                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                            message: '有効なメールアドレスを入力してください',
                                                        },
                                                    })}
                                                    placeholder="例：example@email.com"
                                                />
                                                <FormErrorMessage>{errors.organizer_email?.message}</FormErrorMessage>
                                                <Text fontSize="xs" color="gray.500" mt={1}>
                                                    ※公開前にメール認証が必要です
                                                </Text>
                                            </FormControl>

                                            <FormControl>
                                                <FormLabel>
                                                    <Icon as={Clock} mr={1} boxSize={4} />
                                                    所要時間
                                                </FormLabel>
                                                <Select {...register('duration_minutes')}>
                                                    <option value={15}>15分</option>
                                                    <option value={30}>30分</option>
                                                    <option value={45}>45分</option>
                                                    <option value={60}>60分</option>
                                                </Select>
                                            </FormControl>
                                        </VStack>
                                    </CardBody>
                                </Card>

                                {/* Calendar & Slot Generator */}
                                <Card bg={cardBg} border="1px solid" borderColor={borderColor}>
                                    <CardHeader pb={2}>
                                        <Heading size="md">空き枠を設定</Heading>
                                    </CardHeader>
                                    <CardBody>
                                        <VStack spacing={4}>
                                            {/* Mini Calendar */}
                                            <Box w="full">
                                                <HStack justify="space-between" mb={2}>
                                                    <IconButton
                                                        aria-label="前の月"
                                                        icon={<Text>←</Text>}
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                                                    />
                                                    <Text fontWeight="bold">
                                                        {format(currentMonth, 'yyyy年M月', { locale: ja })}
                                                    </Text>
                                                    <IconButton
                                                        aria-label="次の月"
                                                        icon={<Text>→</Text>}
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                                                    />
                                                </HStack>
                                                <SimpleGrid columns={7} spacing={1}>
                                                    {['日', '月', '火', '水', '木', '金', '土'].map(d => (
                                                        <Text key={d} textAlign="center" fontSize="xs" fontWeight="bold" color="gray.500">
                                                            {d}
                                                        </Text>
                                                    ))}
                                                    {getDaysInMonth(currentMonth).map((date, i) => (
                                                        <Button
                                                            key={i}
                                                            size="sm"
                                                            variant={date && selectedDates.some(d => isSameDay(d, date)) ? 'solid' : 'ghost'}
                                                            colorScheme={date && selectedDates.some(d => isSameDay(d, date)) ? 'blue' : 'gray'}
                                                            isDisabled={!date || date < startOfDay(new Date())}
                                                            onClick={() => date && toggleDate(date)}
                                                            opacity={!date ? 0 : 1}
                                                        >
                                                            {date?.getDate() || ''}
                                                        </Button>
                                                    ))}
                                                </SimpleGrid>
                                                {selectedDates.length > 0 && (
                                                    <Text fontSize="sm" color="blue.500" mt={2}>
                                                        {selectedDates.length}日選択中
                                                    </Text>
                                                )}
                                            </Box>

                                            <Divider />

                                            {/* Time Range */}
                                            <HStack w="full">
                                                <FormControl>
                                                    <FormLabel fontSize="sm">開始</FormLabel>
                                                    <Select
                                                        size="sm"
                                                        value={slotStartTime}
                                                        onChange={e => setSlotStartTime(e.target.value)}
                                                    >
                                                        {timeOptions.map(t => (
                                                            <option key={t} value={t}>{t}</option>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                                <FormControl>
                                                    <FormLabel fontSize="sm">終了</FormLabel>
                                                    <Select
                                                        size="sm"
                                                        value={slotEndTime}
                                                        onChange={e => setSlotEndTime(e.target.value)}
                                                    >
                                                        {timeOptions.map(t => (
                                                            <option key={t} value={t}>{t}</option>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </HStack>

                                            <Button
                                                leftIcon={<Plus size={18} />}
                                                colorScheme="blue"
                                                variant="outline"
                                                w="full"
                                                onClick={generateSlots}
                                                isDisabled={selectedDates.length === 0}
                                            >
                                                枠を追加
                                            </Button>
                                        </VStack>
                                    </CardBody>
                                </Card>
                            </VStack>

                            {/* Right Column - Slot List */}
                            <VStack spacing={6} align="stretch">
                                <Card bg={cardBg} border="1px solid" borderColor={borderColor} minH="400px">
                                    <CardHeader pb={2}>
                                        <HStack justify="space-between">
                                            <Heading size="md">
                                                公開する空き枠
                                                <Badge ml={2} colorScheme="blue">{slots.length}件</Badge>
                                            </Heading>
                                        </HStack>
                                    </CardHeader>
                                    <CardBody>
                                        {slots.length === 0 ? (
                                            <VStack py={8} spacing={4}>
                                                <Icon as={Calendar} boxSize={12} color="gray.300" />
                                                <Text color="gray.500" textAlign="center">
                                                    まだ空き枠がありません<br />
                                                    日付と時間を選んで追加してください
                                                </Text>
                                            </VStack>
                                        ) : (
                                            <VStack spacing={4} align="stretch" maxH="500px" overflowY="auto">
                                                {Object.entries(slotsByDate).map(([dateKey, dateSlots]) => (
                                                    <Box key={dateKey}>
                                                        <Text fontWeight="bold" fontSize="sm" color="gray.600" mb={2}>
                                                            {format(new Date(dateKey), 'M月d日 (E)', { locale: ja })}
                                                        </Text>
                                                        <Flex wrap="wrap" gap={2}>
                                                            {dateSlots.map(slot => (
                                                                <Badge
                                                                    key={slot.id}
                                                                    colorScheme="blue"
                                                                    variant="subtle"
                                                                    px={2}
                                                                    py={1}
                                                                    borderRadius="md"
                                                                    display="flex"
                                                                    alignItems="center"
                                                                    gap={1}
                                                                >
                                                                    {format(new Date(slot.start_at), 'HH:mm')}
                                                                    <IconButton
                                                                        aria-label="削除"
                                                                        icon={<Trash2 size={12} />}
                                                                        size="xs"
                                                                        variant="ghost"
                                                                        colorScheme="red"
                                                                        onClick={() => removeSlot(slot.id)}
                                                                    />
                                                                </Badge>
                                                            ))}
                                                        </Flex>
                                                    </Box>
                                                ))}
                                            </VStack>
                                        )}
                                    </CardBody>
                                </Card>

                                {/* CTA */}
                                <Card bg="blue.50" border="1px solid" borderColor="blue.200">
                                    <CardBody>
                                        <VStack spacing={4}>
                                            <Button
                                                type="submit"
                                                colorScheme="blue"
                                                size="lg"
                                                w="full"
                                                isLoading={isSubmitting}
                                                isDisabled={slots.length === 0}
                                                leftIcon={<LinkIcon size={18} />}
                                            >
                                                公開してリンクをコピー
                                            </Button>
                                            <Text fontSize="xs" color="gray.600" textAlign="center">
                                                公開するにはメール認証が必要です（1分で完了）
                                            </Text>
                                        </VStack>
                                    </CardBody>
                                </Card>
                            </VStack>
                        </SimpleGrid>
                    </form>
                </VStack>
            </Container>
            <Footer />

            {/* Success Modal */}
            <Modal isOpen={isOpen} onClose={onClose} size="md">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>認証メールを送信しました</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4}>
                            <Icon as={Mail} boxSize={12} color="blue.500" />
                            <Text textAlign="center">
                                入力したメールアドレスに認証リンクを送信しました。<br />
                                リンクを開くと予約ページが公開されます。
                            </Text>
                            {verifyUrl && (
                                <Box w="full" p={3} bg="gray.100" borderRadius="md">
                                    <Text fontSize="xs" color="gray.500" mb={1}>[開発用] 認証URL:</Text>
                                    <Text fontSize="sm" wordBreak="break-all">{verifyUrl}</Text>
                                </Box>
                            )}
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme="blue" onClick={onClose}>
                            閉じる
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    );
}
