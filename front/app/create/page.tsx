'use client';

import { useState } from 'react';
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
    FormHelperText,
    Input,
    Textarea,
    Switch,
    Button,
    IconButton,
    Card,
    CardBody,
    Divider,
    useColorModeValue,
    useToast,
    Badge,
    Flex,
    InputGroup,
    InputRightElement,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Eye, EyeOff, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { useCreateSchedule } from '@/hooks/useApi';
import { formatDateTime } from '@/lib/date';
import type { CandidateInput } from '@/types';

const MotionBox = motion(Box);

// Validation schema
const schema = z.object({
    name: z.string().min(1, 'イベント名を入力してください'),
    ownerName: z.string().min(1, '主催者名を入力してください'),
    ownerEmail: z.string().email('有効なメールアドレスを入力してください').optional().or(z.literal('')),
    department: z.string().optional(),
    description: z.string().optional(),
    editKey: z.string().optional(),
    deadline: z.string().optional(),
    allowMaybe: z.boolean(),
    notifyOnResponse: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function CreatePage() {
    const router = useRouter();
    const toast = useToast();
    const [showPassword, setShowPassword] = useState(false);
    const [candidates, setCandidates] = useState<CandidateInput[]>([]);
    const [newCandidateDate, setNewCandidateDate] = useState('');
    const [newCandidateStartTime, setNewCandidateStartTime] = useState('09:00');
    const [newCandidateEndTime, setNewCandidateEndTime] = useState('10:00');

    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const candidateBg = useColorModeValue('gray.50', 'gray.700');

    const { mutate: createSchedule, isPending } = useCreateSchedule();

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            allowMaybe: true,
            notifyOnResponse: false,
        },
    });

    const ownerEmail = watch('ownerEmail');

    const addCandidate = () => {
        if (!newCandidateDate) {
            toast({
                title: '日付を選択してください',
                status: 'warning',
                duration: 2000,
            });
            return;
        }

        const startAt = `${newCandidateDate}T${newCandidateStartTime}:00`;
        const endAt = `${newCandidateDate}T${newCandidateEndTime}:00`;

        // Check for duplicates
        const isDuplicate = candidates.some(
            (c) => c.start_at === startAt && c.end_at === endAt
        );

        if (isDuplicate) {
            toast({
                title: '同じ候補日が既に追加されています',
                status: 'warning',
                duration: 2000,
            });
            return;
        }

        setCandidates([
            ...candidates,
            {
                start_at: startAt,
                end_at: endAt,
                note: '',
                order: candidates.length,
            },
        ]);

        // Reset
        setNewCandidateDate('');
    };

    const removeCandidate = (index: number) => {
        setCandidates(candidates.filter((_, i) => i !== index));
    };

    const onSubmit = (data: FormData) => {
        if (candidates.length === 0) {
            toast({
                title: '候補日を追加してください',
                description: '少なくとも1つの候補日が必要です',
                status: 'error',
                duration: 3000,
            });
            return;
        }

        createSchedule(
            {
                name: data.name,
                owner_name: data.ownerName,
                owner_email: data.ownerEmail || undefined,
                department: data.department || undefined,
                description: data.description || undefined,
                edit_key: data.editKey || undefined,
                deadline: data.deadline || undefined,
                allow_maybe: data.allowMaybe,
                notify_on_response: data.notifyOnResponse,
                candidates,
            },
            {
                onSuccess: (schedule) => {
                    toast({
                        title: 'イベントを作成しました',
                        description: 'URLを共有して回答を集めましょう',
                        status: 'success',
                        duration: 3000,
                    });
                    router.push(`/event/${schedule.uuid}`);
                },
                onError: (error) => {
                    toast({
                        title: 'エラーが発生しました',
                        description: error.message,
                        status: 'error',
                        duration: 5000,
                    });
                },
            }
        );
    };

    return (
        <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
            <Header />

            <Container maxW="container.lg" py={8}>
                <VStack spacing={8} align="stretch">
                    {/* Page Header */}
                    <VStack spacing={2} align="start">
                        <Heading size="lg">新規イベント作成</Heading>
                        <Text color="gray.600">
                            候補日を設定して、参加者に回答をもらいましょう
                        </Text>
                    </VStack>

                    <form onSubmit={handleSubmit(onSubmit)}>
                        <VStack spacing={6} align="stretch">
                            {/* Basic Info Card */}
                            <Card bg={cardBg} shadow="sm">
                                <CardBody>
                                    <VStack spacing={6} align="stretch">
                                        <Heading size="sm" color="brand.500">
                                            1. イベント情報
                                        </Heading>

                                        <FormControl isRequired isInvalid={!!errors.name}>
                                            <FormLabel>イベント名</FormLabel>
                                            <Input
                                                {...register('name')}
                                                placeholder="例：チームミーティング"
                                                size="lg"
                                            />
                                            <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
                                        </FormControl>

                                        <HStack spacing={4} align="start">
                                            <FormControl isRequired isInvalid={!!errors.ownerName} flex={1}>
                                                <FormLabel>主催者名</FormLabel>
                                                <Input
                                                    {...register('ownerName')}
                                                    placeholder="例：山田太郎"
                                                />
                                                <FormErrorMessage>{errors.ownerName?.message}</FormErrorMessage>
                                            </FormControl>

                                            <FormControl flex={1}>
                                                <FormLabel>所属（任意）</FormLabel>
                                                <Input
                                                    {...register('department')}
                                                    placeholder="例：開発チーム"
                                                />
                                            </FormControl>
                                        </HStack>

                                        <FormControl isInvalid={!!errors.ownerEmail}>
                                            <FormLabel>メールアドレス（任意）</FormLabel>
                                            <Input
                                                {...register('ownerEmail')}
                                                type="email"
                                                placeholder="回答時の通知を受け取るメールアドレス"
                                            />
                                            <FormErrorMessage>{errors.ownerEmail?.message}</FormErrorMessage>
                                            <FormHelperText>
                                                回答があった際に通知を受け取れます
                                            </FormHelperText>
                                        </FormControl>

                                        <FormControl>
                                            <FormLabel>説明・メモ（任意）</FormLabel>
                                            <Textarea
                                                {...register('description')}
                                                placeholder="イベントの詳細や補足情報を記入してください"
                                                rows={3}
                                            />
                                        </FormControl>
                                    </VStack>
                                </CardBody>
                            </Card>

                            {/* Candidates Card */}
                            <Card bg={cardBg} shadow="sm">
                                <CardBody>
                                    <VStack spacing={6} align="stretch">
                                        <HStack justify="space-between">
                                            <Heading size="sm" color="brand.500">
                                                2. 候補日を追加
                                            </Heading>
                                            <Badge colorScheme="brand" fontSize="sm">
                                                {candidates.length}件
                                            </Badge>
                                        </HStack>

                                        {/* Add Candidate Form */}
                                        <Box
                                            p={4}
                                            borderRadius="lg"
                                            border="2px dashed"
                                            borderColor={borderColor}
                                        >
                                            <VStack spacing={4}>
                                                <HStack spacing={4} w="full" flexWrap="wrap">
                                                    <FormControl flex={2} minW="200px">
                                                        <FormLabel fontSize="sm">日付</FormLabel>
                                                        <Input
                                                            type="date"
                                                            value={newCandidateDate}
                                                            onChange={(e) => setNewCandidateDate(e.target.value)}
                                                        />
                                                    </FormControl>
                                                    <FormControl flex={1} minW="120px">
                                                        <FormLabel fontSize="sm">開始時刻</FormLabel>
                                                        <Input
                                                            type="time"
                                                            value={newCandidateStartTime}
                                                            onChange={(e) => setNewCandidateStartTime(e.target.value)}
                                                        />
                                                    </FormControl>
                                                    <FormControl flex={1} minW="120px">
                                                        <FormLabel fontSize="sm">終了時刻</FormLabel>
                                                        <Input
                                                            type="time"
                                                            value={newCandidateEndTime}
                                                            onChange={(e) => setNewCandidateEndTime(e.target.value)}
                                                        />
                                                    </FormControl>
                                                </HStack>
                                                <Button
                                                    leftIcon={<Plus size={18} />}
                                                    colorScheme="brand"
                                                    variant="outline"
                                                    onClick={addCandidate}
                                                    w="full"
                                                >
                                                    候補日を追加
                                                </Button>
                                            </VStack>
                                        </Box>

                                        {/* Candidates List */}
                                        <AnimatePresence>
                                            {candidates.map((candidate, index) => (
                                                <MotionBox
                                                    key={`${candidate.start_at}-${index}`}
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <HStack
                                                        p={3}
                                                        bg={candidateBg}
                                                        borderRadius="lg"
                                                        justify="space-between"
                                                    >
                                                        <HStack spacing={3}>
                                                            <Flex
                                                                align="center"
                                                                justify="center"
                                                                w={8}
                                                                h={8}
                                                                borderRadius="full"
                                                                bg="brand.100"
                                                                color="brand.600"
                                                                fontWeight="bold"
                                                                fontSize="sm"
                                                            >
                                                                {index + 1}
                                                            </Flex>
                                                            <VStack align="start" spacing={0}>
                                                                <HStack>
                                                                    <Calendar size={14} />
                                                                    <Text fontWeight="medium">
                                                                        {formatDateTime(candidate.start_at)}
                                                                    </Text>
                                                                </HStack>
                                                                <HStack>
                                                                    <Clock size={14} />
                                                                    <Text fontSize="sm" color="gray.500">
                                                                        {candidate.start_at.split('T')[1].slice(0, 5)} - {candidate.end_at.split('T')[1].slice(0, 5)}
                                                                    </Text>
                                                                </HStack>
                                                            </VStack>
                                                        </HStack>
                                                        <IconButton
                                                            aria-label="削除"
                                                            icon={<Trash2 size={16} />}
                                                            size="sm"
                                                            variant="ghost"
                                                            colorScheme="red"
                                                            onClick={() => removeCandidate(index)}
                                                        />
                                                    </HStack>
                                                </MotionBox>
                                            ))}
                                        </AnimatePresence>

                                        {candidates.length === 0 && (
                                            <Text textAlign="center" color="gray.500" py={4}>
                                                候補日を追加してください
                                            </Text>
                                        )}
                                    </VStack>
                                </CardBody>
                            </Card>

                            {/* Settings Card */}
                            <Card bg={cardBg} shadow="sm">
                                <CardBody>
                                    <VStack spacing={6} align="stretch">
                                        <Heading size="sm" color="brand.500">
                                            3. オプション設定
                                        </Heading>

                                        <HStack spacing={4} align="start">
                                            <FormControl flex={1}>
                                                <FormLabel>編集キー（任意）</FormLabel>
                                                <InputGroup>
                                                    <Input
                                                        {...register('editKey')}
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder="イベント編集用のパスワード"
                                                    />
                                                    <InputRightElement>
                                                        <IconButton
                                                            aria-label={showPassword ? '非表示' : '表示'}
                                                            icon={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                        />
                                                    </InputRightElement>
                                                </InputGroup>
                                                <FormHelperText>
                                                    設定すると編集時にパスワードが必要になります
                                                </FormHelperText>
                                            </FormControl>

                                            <FormControl flex={1}>
                                                <FormLabel>回答期限（任意）</FormLabel>
                                                <Input
                                                    {...register('deadline')}
                                                    type="datetime-local"
                                                />
                                            </FormControl>
                                        </HStack>

                                        <Divider />

                                        <HStack justify="space-between">
                                            <VStack align="start" spacing={0}>
                                                <Text fontWeight="medium">「△（調整可能）」を許可</Text>
                                                <Text fontSize="sm" color="gray.500">
                                                    回答に「調整可能」の選択肢を表示します
                                                </Text>
                                            </VStack>
                                            <Switch
                                                {...register('allowMaybe')}
                                                colorScheme="brand"
                                                size="lg"
                                            />
                                        </HStack>

                                        <HStack justify="space-between">
                                            <VStack align="start" spacing={0}>
                                                <Text fontWeight="medium">回答時にメール通知</Text>
                                                <Text fontSize="sm" color="gray.500">
                                                    新しい回答があった時にメールで通知します
                                                </Text>
                                            </VStack>
                                            <Switch
                                                {...register('notifyOnResponse')}
                                                colorScheme="brand"
                                                size="lg"
                                                isDisabled={!ownerEmail}
                                            />
                                        </HStack>
                                    </VStack>
                                </CardBody>
                            </Card>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                size="lg"
                                colorScheme="brand"
                                rightIcon={<ArrowRight size={18} />}
                                isLoading={isPending}
                                loadingText="作成中..."
                                isDisabled={candidates.length === 0}
                            >
                                イベントを作成する
                            </Button>
                        </VStack>
                    </form>
                </VStack>
            </Container>
        </Box>
    );
}
