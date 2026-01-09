'use client';

/**
 * メール認証ページ
 * 認証トークンを検証して予約ページを公開
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    Box,
    Container,
    VStack,
    Heading,
    Text,
    Spinner,
    Icon,
    Alert,
    AlertIcon,
    Button,
} from '@chakra-ui/react';
import { Check, X } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function BookingVerifyPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [slug, setSlug] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        const pageSlug = searchParams.get('slug');

        if (!token || !pageSlug) {
            setStatus('error');
            setMessage('無効なリンクです');
            return;
        }

        setSlug(pageSlug);

        // Verify the token
        fetch('/api/v1/oneonone/booking/verify/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, slug: pageSlug }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.slug) {
                    setStatus('success');
                    setMessage('認証が完了しました。予約ページが公開されています。');
                    // Auto redirect after 2 seconds
                    setTimeout(() => {
                        // Note: In real scenario, we'd need the host token here
                        // For now, just show success
                    }, 2000);
                } else {
                    setStatus('error');
                    setMessage(data.error || '認証に失敗しました');
                }
            })
            .catch(() => {
                setStatus('error');
                setMessage('認証に失敗しました');
            });
    }, [searchParams]);

    return (
        <Box minH="100vh">
            <Header />
            <Container maxW="container.sm" py={16}>
                <VStack spacing={8}>
                    {status === 'loading' && (
                        <>
                            <Spinner size="xl" color="blue.500" thickness="4px" />
                            <Heading size="lg">認証中...</Heading>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <Box
                                w={20}
                                h={20}
                                borderRadius="full"
                                bg="green.100"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                            >
                                <Icon as={Check} boxSize={10} color="green.500" />
                            </Box>
                            <Heading size="lg" color="green.600">公開しました！</Heading>
                            <Text color="gray.600" textAlign="center">
                                {message}
                            </Text>
                            <VStack spacing={4}>
                                <Button
                                    colorScheme="blue"
                                    size="lg"
                                    onClick={() => router.push(`/booking/${slug}`)}
                                >
                                    公開ページを見る
                                </Button>
                                <Text fontSize="sm" color="gray.500">
                                    管理リンクはメールに記載されています
                                </Text>
                            </VStack>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <Box
                                w={20}
                                h={20}
                                borderRadius="full"
                                bg="red.100"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                            >
                                <Icon as={X} boxSize={10} color="red.500" />
                            </Box>
                            <Heading size="lg" color="red.600">認証に失敗しました</Heading>
                            <Alert status="error" borderRadius="md">
                                <AlertIcon />
                                {message}
                            </Alert>
                            <Button onClick={() => router.push('/booking/new')}>
                                新規作成に戻る
                            </Button>
                        </>
                    )}
                </VStack>
            </Container>
            <Footer />
        </Box>
    );
}
