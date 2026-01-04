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

export default function RegisterPage() {
    const router = useRouter();
    const toast = useToast();
    const { register, isLoading } = useAuthStore();
    
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
            setError('Passwords do not match');
            return;
        }

        try {
            await register(formData);
            toast({
                title: 'Account created!',
                status: 'success',
                duration: 3000,
            });
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Registration failed');
            toast({
                title: 'Error',
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
                    <Heading size="xl">Create Account</Heading>

                    {error && (
                        <Box w="full" p={3} bg="red.50" color="red.500" borderRadius="md">
                             <Text fontSize="sm">{error}</Text>
                        </Box>
                    )}

                    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                        <VStack spacing={4}>
                            <FormControl isRequired>
                                <FormLabel>Username</FormLabel>
                                <Input
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                />
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>Email</FormLabel>
                                <Input
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>Password</FormLabel>
                                <Input
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>Confirm Password</FormLabel>
                                <Input
                                    name="password_confirm"
                                    type="password"
                                    value={formData.password_confirm}
                                    onChange={handleChange}
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel>First Name</FormLabel>
                                <Input
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel>Last Name</FormLabel>
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
                                Register
                            </Button>
                        </VStack>
                    </form>

                    <Text fontSize="sm">
                        Already have an account?{' '}
                        <ChakraLink as={Link} href="/login" color="brand.500">
                            Login here
                        </ChakraLink>
                    </Text>
                </VStack>
            </Box>
        </Container>
    );
}
