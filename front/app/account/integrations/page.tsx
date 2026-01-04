'use client';

import { useEffect, useState } from 'react';
import {
    Box,
    Container,
    Heading,
    VStack,
    HStack,
    Button,
    Text,
    useToast,
    Card,
    CardBody,
    Badge,
    Spinner,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Integration {
    id: number;
    provider: string;
    is_active: boolean;
    created_at: string;
}

export default function IntegrationsPage() {
    const router = useRouter();
    const toast = useToast();
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState<string | null>(null);

    useEffect(() => {
        loadIntegrations();
    }, []);

    const loadIntegrations = async () => {
        try {
            const response = await api.getIntegrations();
            setIntegrations(response.results || []);
        } catch (error) {
            console.error('Failed to load integrations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnectGoogle = async () => {
        setConnecting('google');
        try {
            const { auth_url } = await api.getGoogleConnectUrl();
            window.location.href = auth_url;
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                status: 'error',
            });
            setConnecting(null);
        }
    };

    const handleConnectOutlook = async () => {
        setConnecting('outlook');
        try {
            const { auth_url } = await api.getOutlookConnectUrl();
            window.location.href = auth_url;
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                status: 'error',
            });
            setConnecting(null);
        }
    };

    const handleDisconnect = async (provider: 'google' | 'outlook') => {
        try {
            if (provider === 'google') {
                await api.disconnectGoogle();
            } else {
                await api.disconnectOutlook();
            }
            toast({
                title: 'Disconnected',
                status: 'success',
            });
            loadIntegrations();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                status: 'error',
            });
        }
    };

    const googleIntegration = integrations.find(i => i.provider === 'google' && i.is_active);
    const outlookIntegration = integrations.find(i => i.provider === 'outlook' && i.is_active);

    if (loading) {
        return (
            <Container maxW="container.md" py={10}>
                <Spinner />
            </Container>
        );
    }

    return (
        <Container maxW="container.md" py={10}>
            <Heading mb={6}>Calendar Integrations</Heading>
            <Text mb={8} color="gray.600">
                Connect your calendar to enable automatic scheduling and event creation.
            </Text>

            <VStack spacing={4} align="stretch">
                {/* Google Calendar */}
                <Card>
                    <CardBody>
                        <HStack justify="space-between">
                            <HStack spacing={4}>
                                <Text fontSize="2xl">📅</Text>
                                <Box>
                                    <Text fontWeight="bold">Google Calendar</Text>
                                    <Badge colorScheme={googleIntegration ? 'green' : 'gray'}>
                                        {googleIntegration ? 'Connected' : 'Not Connected'}
                                    </Badge>
                                </Box>
                            </HStack>
                            {googleIntegration ? (
                                <Button
                                    colorScheme="red"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDisconnect('google')}
                                >
                                    Disconnect
                                </Button>
                            ) : (
                                <Button
                                    colorScheme="blue"
                                    size="sm"
                                    onClick={handleConnectGoogle}
                                    isLoading={connecting === 'google'}
                                >
                                    Connect
                                </Button>
                            )}
                        </HStack>
                    </CardBody>
                </Card>

                {/* Outlook Calendar */}
                <Card>
                    <CardBody>
                        <HStack justify="space-between">
                            <HStack spacing={4}>
                                <Text fontSize="2xl">📆</Text>
                                <Box>
                                    <Text fontWeight="bold">Outlook Calendar</Text>
                                    <Badge colorScheme={outlookIntegration ? 'green' : 'gray'}>
                                        {outlookIntegration ? 'Connected' : 'Not Connected'}
                                    </Badge>
                                </Box>
                            </HStack>
                            {outlookIntegration ? (
                                <Button
                                    colorScheme="red"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDisconnect('outlook')}
                                >
                                    Disconnect
                                </Button>
                            ) : (
                                <Button
                                    colorScheme="blue"
                                    size="sm"
                                    onClick={handleConnectOutlook}
                                    isLoading={connecting === 'outlook'}
                                >
                                    Connect
                                </Button>
                            )}
                        </HStack>
                    </CardBody>
                </Card>
            </VStack>

            <Button mt={8} variant="ghost" onClick={() => router.back()}>
                ← Back
            </Button>
        </Container>
    );
}
