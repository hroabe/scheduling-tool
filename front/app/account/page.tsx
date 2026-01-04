'use client';

/**
 * Account Page - Login/Register/Profile
 * RFC-0003: ユーザー認証/アカウント機能
 */

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
    Input,
    Button,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Card,
    CardBody,
    CardHeader,
    useToast,
    Divider,
    Badge,
    IconButton,
    Flex,
    Spinner,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import type { LoginInput, RegisterInput } from '@/types';

export default function AccountPage() {
    const router = useRouter();
    const toast = useToast();
    const { user, isAuthenticated, isLoading, login, logout, register, updateProfile } = useAuthStore();
    const [tabIndex, setTabIndex] = useState(0);

    // If authenticated, show profile
    if (isAuthenticated && user) {
        return <ProfileSection />;
    }

    return (
        <Container maxW="container.sm" py={8}>
            <VStack spacing={6}>
                <Heading size="lg">アカウント</Heading>
                
                <Card w="full">
                    <Tabs index={tabIndex} onChange={setTabIndex} isFitted>
                        <TabList>
                            <Tab>ログイン</Tab>
                            <Tab>新規登録</Tab>
                        </TabList>
                        <TabPanels>
                            <TabPanel>
                                <LoginForm />
                            </TabPanel>
                            <TabPanel>
                                <RegisterForm />
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                </Card>
            </VStack>
        </Container>
    );
}

function LoginForm() {
    const toast = useToast();
    const router = useRouter();
    const { login, isLoading } = useAuthStore();
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginInput>();

    const onSubmit = async (data: LoginInput) => {
        try {
            await login(data.username, data.password);
            toast({
                title: 'ログインしました',
                status: 'success',
                duration: 3000,
            });
            router.push('/account/events');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'ログインに失敗しました';
            toast({
                title: 'エラー',
                description: message,
                status: 'error',
                duration: 5000,
            });
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <VStack spacing={4}>
                <FormControl isInvalid={!!errors.username}>
                    <FormLabel>ユーザー名</FormLabel>
                    <Input
                        {...register('username', { required: 'ユーザー名は必須です' })}
                        placeholder="username"
                    />
                    <FormErrorMessage>{errors.username?.message}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.password}>
                    <FormLabel>パスワード</FormLabel>
                    <Input
                        type="password"
                        {...register('password', { required: 'パスワードは必須です' })}
                        placeholder="••••••••"
                    />
                    <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
                </FormControl>

                <Button
                    type="submit"
                    colorScheme="blue"
                    w="full"
                    isLoading={isLoading}
                >
                    ログイン
                </Button>
            </VStack>
        </form>
    );
}

function RegisterForm() {
    const toast = useToast();
    const router = useRouter();
    const { register: registerUser, isLoading } = useAuthStore();
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<RegisterInput>();

    const password = watch('password');

    const onSubmit = async (data: RegisterInput) => {
        try {
            await registerUser(data);
            toast({
                title: '登録が完了しました',
                status: 'success',
                duration: 3000,
            });
            router.push('/account/events');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '登録に失敗しました';
            toast({
                title: 'エラー',
                description: message,
                status: 'error',
                duration: 5000,
            });
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <VStack spacing={4}>
                <FormControl isInvalid={!!errors.username}>
                    <FormLabel>ユーザー名</FormLabel>
                    <Input
                        {...register('username', { required: 'ユーザー名は必須です' })}
                        placeholder="username"
                    />
                    <FormErrorMessage>{errors.username?.message}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.email}>
                    <FormLabel>メールアドレス</FormLabel>
                    <Input
                        type="email"
                        {...register('email', {
                            required: 'メールアドレスは必須です',
                            pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: '有効なメールアドレスを入力してください',
                            },
                        })}
                        placeholder="email@example.com"
                    />
                    <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
                </FormControl>

                <HStack w="full" spacing={4}>
                    <FormControl isInvalid={!!errors.first_name}>
                        <FormLabel>姓</FormLabel>
                        <Input {...register('first_name')} placeholder="山田" />
                    </FormControl>
                    <FormControl isInvalid={!!errors.last_name}>
                        <FormLabel>名</FormLabel>
                        <Input {...register('last_name')} placeholder="太郎" />
                    </FormControl>
                </HStack>

                <FormControl isInvalid={!!errors.password}>
                    <FormLabel>パスワード</FormLabel>
                    <Input
                        type="password"
                        {...register('password', {
                            required: 'パスワードは必須です',
                            minLength: {
                                value: 8,
                                message: 'パスワードは8文字以上必要です',
                            },
                        })}
                        placeholder="••••••••"
                    />
                    <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.password_confirm}>
                    <FormLabel>パスワード（確認）</FormLabel>
                    <Input
                        type="password"
                        {...register('password_confirm', {
                            required: 'パスワード（確認）は必須です',
                            validate: (value) =>
                                value === password || 'パスワードが一致しません',
                        })}
                        placeholder="••••••••"
                    />
                    <FormErrorMessage>{errors.password_confirm?.message}</FormErrorMessage>
                </FormControl>

                <Button
                    type="submit"
                    colorScheme="blue"
                    w="full"
                    isLoading={isLoading}
                >
                    登録
                </Button>
            </VStack>
        </form>
    );
}

function ProfileSection() {
    const toast = useToast();
    const router = useRouter();
    const { user, logout, isLoading } = useAuthStore();

    const handleLogout = async () => {
        try {
            await logout();
            toast({
                title: 'ログアウトしました',
                status: 'info',
                duration: 3000,
            });
            router.push('/');
        } catch {
            toast({
                title: 'エラー',
                description: 'ログアウトに失敗しました',
                status: 'error',
            });
        }
    };

    if (!user) return null;

    return (
        <Container maxW="container.md" py={8}>
            <VStack spacing={6} align="stretch">
                <Flex justify="space-between" align="center">
                    <Heading size="lg">マイアカウント</Heading>
                    <Button
                        variant="outline"
                        colorScheme="red"
                        onClick={handleLogout}
                        isLoading={isLoading}
                    >
                        ログアウト
                    </Button>
                </Flex>

                <Card>
                    <CardHeader>
                        <Heading size="md">プロフィール</Heading>
                    </CardHeader>
                    <CardBody>
                        <VStack spacing={4} align="stretch">
                            <HStack justify="space-between">
                                <Text fontWeight="bold">ユーザー名</Text>
                                <Text>{user.username}</Text>
                            </HStack>
                            <HStack justify="space-between">
                                <Text fontWeight="bold">メールアドレス</Text>
                                <Text>{user.email}</Text>
                            </HStack>
                            <HStack justify="space-between">
                                <Text fontWeight="bold">名前</Text>
                                <Text>{user.first_name} {user.last_name}</Text>
                            </HStack>
                            <HStack justify="space-between">
                                <Text fontWeight="bold">タイムゾーン</Text>
                                <Text>{user.profile?.timezone_name || 'Asia/Tokyo'}</Text>
                            </HStack>
                        </VStack>
                    </CardBody>
                </Card>

                <Divider />

                <HStack spacing={4}>
                    <Button
                        colorScheme="blue"
                        onClick={() => router.push('/account/events')}
                    >
                        マイイベント
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => router.push('/create')}
                    >
                        新規イベント作成
                    </Button>
                </HStack>
            </VStack>
        </Container>
    );
}
