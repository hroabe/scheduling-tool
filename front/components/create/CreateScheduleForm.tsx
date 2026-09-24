'use client';

import { useState } from 'react';
import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Box,
    Button,
    Card,
    CardBody,
    Container,
    FormControl,
    FormErrorMessage,
    FormHelperText,
    FormLabel,
    Heading,
    IconButton,
    Input,
    InputGroup,
    InputRightElement,
    Switch,
    Text,
    Textarea,
    VStack,
    useToast,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CandidatePicker, draftsToCandidateInputs, isDraftValid, type CandidateDraft } from './CandidatePicker';
import { useCreateSchedule } from '@/hooks/useApi';
import { localInputToISO } from '@/lib/date';
import { useAttributionStore, useEditKeyStore } from '@/stores';

const schema = z.object({
    name: z.string().trim().min(1, 'イベント名を入力してください').max(200, '200文字以内で入力してください'),
    ownerName: z.string().trim().min(1, 'お名前を入力してください').max(100, '100文字以内で入力してください'),
    description: z.string().max(2000, '2000文字以内で入力してください').optional(),
    editKey: z
        .string()
        .max(100, '100文字以内で入力してください')
        .refine((v) => v === '' || v.length >= 4, '編集キーは4文字以上で入力してください')
        .optional(),
    deadline: z
        .string()
        .optional()
        .refine((v) => !v || new Date(v) > new Date(), '回答期限は未来の日時を指定してください'),
    allowMaybe: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function CreateScheduleForm() {
    const router = useRouter();
    const toast = useToast();
    const [showEditKey, setShowEditKey] = useState(false);
    const [drafts, setDrafts] = useState<CandidateDraft[]>([]);
    const [candidateError, setCandidateError] = useState<string | null>(null);
    const setEditKey = useEditKeyStore((state) => state.setKey);
    const { ref, incrementCreated } = useAttributionStore();
    const { mutate: createSchedule, isPending } = useCreateSchedule();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { name: '', ownerName: '', description: '', editKey: '', deadline: '', allowMaybe: true },
    });

    const onSubmit = (values: FormValues) => {
        if (drafts.length === 0) {
            setCandidateError('候補日を1つ以上選択してください');
            return;
        }
        if (!drafts.every(isDraftValid)) {
            setCandidateError('時間帯が正しくない候補があります');
            return;
        }
        setCandidateError(null);

        createSchedule(
            {
                schedule: {
                    name: values.name.trim(),
                    owner_name: values.ownerName.trim(),
                    description: values.description?.trim() || '',
                    edit_key: values.editKey || undefined,
                    deadline: localInputToISO(values.deadline),
                    allow_maybe: values.allowMaybe,
                    timezone_name: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo',
                    candidates: draftsToCandidateInputs(drafts),
                },
                ref,
            },
            {
                onSuccess: (schedule) => {
                    // The creator is the owner in this tab: remember the key for editing
                    setEditKey(schedule.uuid, schedule._edit_key || values.editKey || '');
                    incrementCreated();
                    router.push(`/event/${schedule.uuid}?created=1`);
                },
                onError: (error) => {
                    toast({
                        title: 'イベントを作成できませんでした',
                        description: error.message,
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                    });
                },
            }
        );
    };

    return (
        <Container maxW="container.md" py={{ base: 6, md: 10 }}>
            <VStack spacing={2} align="start" mb={6}>
                <Heading as="h1" size="lg">
                    新規イベント作成
                </Heading>
                <Text color="text.muted">イベント名・お名前・候補日を入力するだけ。登録は不要です。</Text>
            </VStack>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <VStack spacing={6} align="stretch">
                    <Card>
                        <CardBody>
                            <VStack spacing={5} align="stretch">
                                <FormControl isRequired isInvalid={!!errors.name}>
                                    <FormLabel>イベント名</FormLabel>
                                    <Input {...register('name')} placeholder="例: チームミーティング" size="lg" autoComplete="off" />
                                    <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
                                </FormControl>

                                <FormControl isRequired isInvalid={!!errors.ownerName}>
                                    <FormLabel>あなたの名前</FormLabel>
                                    <Input {...register('ownerName')} placeholder="例: 山田太郎" autoComplete="name" />
                                    <FormErrorMessage>{errors.ownerName?.message}</FormErrorMessage>
                                </FormControl>

                                <FormControl isRequired isInvalid={!!candidateError}>
                                    <FormLabel as="div">候補日</FormLabel>
                                    <CandidatePicker
                                        value={drafts}
                                        onChange={(next) => {
                                            setDrafts(next);
                                            if (next.length > 0) setCandidateError(null);
                                        }}
                                    />
                                    <FormErrorMessage>{candidateError}</FormErrorMessage>
                                </FormControl>
                            </VStack>
                        </CardBody>
                    </Card>

                    <Accordion allowToggle>
                        <AccordionItem border="1px solid" borderColor="border.default" borderRadius="xl" bg="bg.card">
                            <h2>
                                <AccordionButton py={4} borderRadius="xl">
                                    <Box as="span" flex="1" textAlign="left" fontWeight="semibold">
                                        詳細設定（任意）
                                    </Box>
                                    <AccordionIcon />
                                </AccordionButton>
                            </h2>
                            <AccordionPanel pb={6}>
                                <VStack spacing={5} align="stretch">
                                    <FormControl isInvalid={!!errors.description}>
                                        <FormLabel>説明</FormLabel>
                                        <Textarea
                                            {...register('description')}
                                            placeholder="場所や持ち物など、参加者に伝えたいこと"
                                            rows={3}
                                        />
                                        <FormErrorMessage>{errors.description?.message}</FormErrorMessage>
                                    </FormControl>

                                    <FormControl isInvalid={!!errors.editKey}>
                                        <FormLabel>編集キー</FormLabel>
                                        <InputGroup>
                                            <Input
                                                {...register('editKey')}
                                                type={showEditKey ? 'text' : 'password'}
                                                placeholder="未入力の場合は自動で発行されます"
                                                autoComplete="new-password"
                                            />
                                            <InputRightElement>
                                                <IconButton
                                                    aria-label={showEditKey ? '編集キーを隠す' : '編集キーを表示'}
                                                    icon={showEditKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    variant="ghost"
                                                    colorScheme="gray"
                                                    size="sm"
                                                    onClick={() => setShowEditKey((v) => !v)}
                                                />
                                            </InputRightElement>
                                        </InputGroup>
                                        <FormHelperText>イベントの編集・日程確定・削除に使うパスワードです（4文字以上）</FormHelperText>
                                        <FormErrorMessage>{errors.editKey?.message}</FormErrorMessage>
                                    </FormControl>

                                    <FormControl isInvalid={!!errors.deadline}>
                                        <FormLabel>回答期限</FormLabel>
                                        <Input {...register('deadline')} type="datetime-local" />
                                        <FormErrorMessage>{errors.deadline?.message}</FormErrorMessage>
                                    </FormControl>

                                    <FormControl display="flex" alignItems="center" justifyContent="space-between">
                                        <Box>
                                            <FormLabel htmlFor="allow-maybe" mb={0}>
                                                「△（調整可能）」を許可
                                            </FormLabel>
                                            <Text fontSize="sm" color="text.muted">
                                                回答に「△」の選択肢を表示します
                                            </Text>
                                        </Box>
                                        <Switch id="allow-maybe" {...register('allowMaybe')} size="lg" />
                                    </FormControl>
                                </VStack>
                            </AccordionPanel>
                        </AccordionItem>
                    </Accordion>

                    <Button
                        type="submit"
                        size="lg"
                        w="full"
                        rightIcon={<ArrowRight size={18} />}
                        isLoading={isPending}
                        loadingText="作成中..."
                    >
                        イベントを作成する
                    </Button>
                </VStack>
            </form>
        </Container>
    );
}
