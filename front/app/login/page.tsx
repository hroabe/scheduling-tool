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
    FormErrorMessage,
    Link as ChakraLink,
} from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function LoginPage() {
    const router = useRouter();
    const toast = useToast();
    const { login, isLoading } = useAuthStore();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            await login(username, password);
            toast({
                title: 'Welcome back!',
                status: 'success',
                duration: 3000,
            });
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'ログインに失敗しました');
            toast({
                title: 'Login Failed',
                description: err.message || 'Please check your credentials',
                status: 'error',
                duration: 5000,
            });
        }
    };

    return (
        <Container maxW="container.sm" py={20}>
            <Box p={8} borderWidth={1} borderRadius="lg" boxShadow="lg" bg="white">
                <VStack spacing={6}>
                    <Heading size="xl">Login</Heading>
                    
                    {error && (
                        <Box w="full" p={3} bg="red.50" color="red.500" borderRadius="md">
                            <Text fontSize="sm" fontWeight="bold">Error</Text>
                            <Text fontSize="sm">{error}</Text>
                        </Box>
                    )}

                    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                        <VStack spacing={4}>
                            <FormControl isRequired isInvalid={!!error}>
                                <FormLabel>Username</FormLabel>
                                <Input
                                    name="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter your username"
                                />
                            </FormControl>

                            <FormControl isRequired isInvalid={!!error}>
                                <FormLabel>Password</FormLabel>
                                <Input
                                    name="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                />
                                <FormErrorMessage>{error}</FormErrorMessage>
                            </FormControl>

                            <Button
                                type="submit"
                                colorScheme="brand"
                                width="full"
                                isLoading={isLoading}
                                loadingText="Logging in..."
                                mt={4}
                            >
                                Login
                            </Button>
                        </VStack>
                    </form>

                    <Text fontSize="sm">
                        Don&apos;t have an account?{' '}
                        <ChakraLink as={Link} href="/register" color="brand.500">
                            Register here
                        </ChakraLink>
                    </Text>
                </VStack>
            </Box>
        </Container>
    );
}
