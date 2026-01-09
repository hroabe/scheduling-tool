'use client';

/**
 * Unified Login/Signup Page
 * 
 * Flow:
 * 1. Show SSO login option + email input
 * 2. User enters email and clicks Continue
 * 3. If email exists -> show password field
 * 4. If email doesn't exist -> redirect to register page with email pre-filled
 */

import { useState } from 'react';
import {
    Box,
    Container,
    Heading,
    VStack,
    FormControl,
    FormLabel,
    Input,
    Button,
    Text,
    useToast,
    Card,
    CardBody,
    Divider,
    HStack,
    Link as ChakraLink,
} from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useI18n } from '@/providers/I18nProvider';
import api from '@/lib/api';
import { Header } from '@/components/layout/Header';

type AuthStep = 'email' | 'password' | 'register';

export default function LoginPage() {
    const router = useRouter();
    const { login, loginWithKeycloak, isLoading } = useAuthStore();
    const { t } = useI18n();
    const toast = useToast();
    
    const [step, setStep] = useState<AuthStep>('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!email) {
            toast({
                title: t('auth.enterEmail'),
                status: 'warning',
                duration: 3000,
            });
            return;
        }

        setIsCheckingEmail(true);
        try {
            // Check if email exists
            const response = await api.checkEmail(email);
            if (response.exists) {
                setStep('password');
            } else {
                // Redirect to register with email pre-filled
                router.push(`/register?email=${encodeURIComponent(email)}`);
            }
        } catch (error) {
            // If API doesn't exist yet, assume email check not available
            // and proceed to password step
            setStep('password');
        } finally {
            setIsCheckingEmail(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            await login(email, password);
            toast({
                title: t('auth.loginSuccess'),
                status: 'success',
                duration: 3000,
            });
            router.push('/account');
        } catch (error) {
            toast({
                title: t('auth.invalidCredentials'),
                status: 'error',
                duration: 3000,
            });
        }
    };

    const handleBack = () => {
        setStep('email');
        setPassword('');
    };

    return (
        <Box minH="100vh" bg="gray.50">
            <Header />
            <Container maxW="md" py={20}>
                <Card>
                    <CardBody p={8}>
                        <VStack spacing={6}>
                            <Heading size="lg">
                                {step === 'email' && t('auth.login')}
                                {step === 'password' && t('auth.enterPassword')}
                            </Heading>

                            {/* Step 1: Email or SSO */}
                            {step === 'email' && (
                                <>
                                    <Button
                                        width="full"
                                        variant="outline"
                                        size="lg"
                                        onClick={loginWithKeycloak}
                                        leftIcon={<Text fontSize="xl">G</Text>}
                                        colorScheme="red"
                                    >
                                        {t('auth.ssoLogin')}
                                    </Button>

                                    <HStack w="full" py={4}>
                                        <Divider />
                                        <Text color="gray.500" fontSize="sm" whiteSpace="nowrap">
                                            {t('auth.orContinueWith')}
                                        </Text>
                                        <Divider />
                                    </HStack>

                                    <form onSubmit={handleEmailSubmit} style={{ width: '100%' }}>
                                        <VStack spacing={4}>
                                            <FormControl>
                                                <FormLabel>{t('auth.email')}</FormLabel>
                                                <Input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="example@email.com"
                                                    size="lg"
                                                    autoFocus
                                                />
                                            </FormControl>

                                            <Button
                                                type="submit"
                                                colorScheme="brand"
                                                width="full"
                                                size="lg"
                                                isLoading={isCheckingEmail}
                                            >
                                                {t('auth.continue')}
                                            </Button>
                                        </VStack>
                                    </form>
                                </>
                            )}

                            {/* Step 2: Password */}
                            {step === 'password' && (
                                <form onSubmit={handlePasswordSubmit} style={{ width: '100%' }}>
                                    <VStack spacing={4}>
                                        <Text fontSize="sm" color="gray.600">
                                            {email}
                                        </Text>
                                        
                                        <FormControl>
                                            <FormLabel>{t('auth.password')}</FormLabel>
                                            <Input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                size="lg"
                                                autoFocus
                                            />
                                        </FormControl>

                                        <Button
                                            type="submit"
                                            colorScheme="brand"
                                            width="full"
                                            size="lg"
                                            isLoading={isLoading}
                                        >
                                            {t('auth.login')}
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            onClick={handleBack}
                                        >
                                            {t('common.back')}
                                        </Button>
                                    </VStack>
                                </form>
                            )}

                            <Divider />

                            <Text fontSize="sm" color="gray.600">
                                {t('auth.newUser')}{' '}
                                <ChakraLink as={Link} href="/register" color="brand.500">
                                    {t('auth.createAccount')}
                                </ChakraLink>
                            </Text>
                        </VStack>
                    </CardBody>
                </Card>
            </Container>
        </Box>
    );
}
