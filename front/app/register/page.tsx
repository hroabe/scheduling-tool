'use client';

import { useState } from 'react';
import {
    Box,
    Button,
    Container,
    FormControl,
    FormLabel,
    Input,
    VStack,
    Heading,
    Text,
    useToast,
    Link as ChakraLink,
} from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useI18n } from '@/providers/I18nProvider';

export default function RegisterPage() {
    const router = useRouter();
    const toast = useToast();
    const { register, isLoading } = useAuthStore();
    const { t } = useI18n();
    
    // Form state
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        password_confirm: '',
        first_name: '',
        last_name: '',
    });
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.password_confirm) {
            setError(t('auth.passwordMismatch'));
            return;
        }

        try {
            await register(formData);
            toast({
                title: t('auth.registerSuccess'),
                status: 'success',
                duration: 3000,
            });
            router.push('/account');
        } catch (err: any) {
            setError(err.message || t('errors.serverError'));
            toast({
                title: t('common.error'),
                description: err.message,
                status: 'error',
                duration: 5000,
            });
        }
    };

    return (
        <Container maxW="container.sm" py={20}>
            <Box p={8} borderWidth={1} borderRadius="lg" boxShadow="lg" bg="white">
                <VStack spacing={6}>
                    <Heading size="xl">{t('auth.register')}</Heading>

                    {error && (
                        <Box w="full" p={3} bg="red.50" color="red.500" borderRadius="md">
                             <Text fontSize="sm">{error}</Text>
                        </Box>
                    )}

                    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                        <VStack spacing={4}>
                            <FormControl isRequired>
                                <FormLabel>{t('auth.username')}</FormLabel>
                                <Input
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                />
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>{t('auth.email')}</FormLabel>
                                <Input
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>{t('auth.password')}</FormLabel>
                                <Input
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>{t('auth.confirmPassword')}</FormLabel>
                                <Input
                                    name="password_confirm"
                                    type="password"
                                    value={formData.password_confirm}
                                    onChange={handleChange}
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel>{t('auth.firstName')}</FormLabel>
                                <Input
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel>{t('auth.lastName')}</FormLabel>
                                <Input
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                />
                            </FormControl>

                            <Button
                                type="submit"
                                colorScheme="brand"
                                width="full"
                                isLoading={isLoading}
                                mt={4}
                            >
                                {t('auth.register')}
                            </Button>
                        </VStack>
                    </form>

                    <Text fontSize="sm">
                        {t('auth.login')}?{' '}
                        <ChakraLink as={Link} href="/login" color="brand.500">
                            {t('auth.login')}
                        </ChakraLink>
                    </Text>
                </VStack>
            </Box>
        </Container>
    );
}

