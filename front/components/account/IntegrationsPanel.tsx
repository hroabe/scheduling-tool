'use client';

/**
 * /account/integrations: Google / Outlook calendar connections (docs/11_integration.md §2.6).
 *
 * - Connect: POST connect/ returns the provider's OAuth URL and the browser goes there.
 *   503 means the server has no client ID configured.
 * - The API's OAuth callback redirects back here with ?provider=&status=connected|error&reason=,
 *   which is shown as a toast and then removed from the URL.
 */

import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    AlertIcon,
    Badge,
    Button,
    Card,
    CardBody,
    Container,
    Flex,
    Heading,
    HStack,
    Skeleton,
    Stack,
    Text,
    VStack,
    useToast,
} from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Mail } from 'lucide-react';
import { queryKeys, useIntegrationStatus } from '@/hooks/useApi';
import api, { ApiError, type IntegrationProvider } from '@/lib/api';
import { formatDateTime } from '@/lib/date';
import { useI18n } from '@/providers/I18nProvider';
import { AccountNav } from './AccountNav';
import { RequireAuth } from './RequireAuth';
import { apiErrorMessage } from './utils';

const PROVIDERS: IntegrationProvider[] = ['google', 'outlook'];
const REASONS = ['denied', 'state', 'code', 'token'];

type Redirect = (url: string) => void;
const defaultRedirect: Redirect = (url) => window.location.assign(url);

function isProvider(value: string | null): value is IntegrationProvider {
    return value === 'google' || value === 'outlook';
}

export function IntegrationsPanel({ redirect = defaultRedirect }: { redirect?: Redirect }) {
    const { t } = useI18n();
    return (
        <Container maxW="container.md" py={{ base: 6, md: 10 }} px={4}>
            <VStack spacing={6} align="stretch">
                <VStack align="stretch" spacing={1}>
                    <Heading as="h1" size="lg">
                        {t('integration.title')}
                    </Heading>
                    <Text color="text.muted">{t('integration.description')}</Text>
                </VStack>
                <AccountNav />
                <RequireAuth>
                    {() => (
                        <>
                            <OAuthResultToast />
                            {PROVIDERS.map((provider) => (
                                <IntegrationCard key={provider} provider={provider} redirect={redirect} />
                            ))}
                        </>
                    )}
                </RequireAuth>
            </VStack>
        </Container>
    );
}

/** Shows the result of the OAuth round-trip once, then cleans the URL */
function OAuthResultToast() {
    const { t } = useI18n();
    const toast = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const handled = useRef(false);

    useEffect(() => {
        const provider = searchParams.get('provider');
        const status = searchParams.get('status');
        if (handled.current || !isProvider(provider) || !status) return;
        handled.current = true;

        const name = t(`integration.providers.${provider}.name`);
        if (status === 'connected') {
            toast({ title: t('integration.connected', { provider: name }), status: 'success', duration: 5000 });
        } else {
            const reason = searchParams.get('reason');
            toast({
                title: t('integration.connectError', { provider: name }),
                description: t(`integration.reasons.${reason && REASONS.includes(reason) ? reason : 'unknown'}`),
                status: 'error',
                duration: 8000,
            });
        }
        void queryClient.invalidateQueries({ queryKey: queryKeys.integrationStatus(provider) });
        router.replace('/account/integrations', { scroll: false });
    }, [queryClient, router, searchParams, t, toast]);

    return null;
}

function IntegrationCard({ provider, redirect }: { provider: IntegrationProvider; redirect: Redirect }) {
    const { t } = useI18n();
    const toast = useToast();
    const queryClient = useQueryClient();
    const { data: status, error, isLoading } = useIntegrationStatus(provider);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [notConfigured, setNotConfigured] = useState(false);

    const name = t(`integration.providers.${provider}.name`);
    const configured = !notConfigured && status?.configured !== false;
    const needsReconnect = !!status?.connected && (status.is_valid === false || status.is_expired === true);
    const Icon = provider === 'google' ? CalendarDays : Mail;

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            const { auth_url } = await api.connectIntegration(provider);
            redirect(auth_url);
        } catch (err) {
            setIsConnecting(false);
            if (err instanceof ApiError && err.status === 503) {
                setNotConfigured(true);
                return;
            }
            toast({
                title: t('integration.connectFailed', { provider: name }),
                description: apiErrorMessage(err, t),
                status: 'error',
                duration: 5000,
            });
        }
    };

    const handleDisconnect = async () => {
        setIsDisconnecting(true);
        try {
            await api.disconnectIntegration(provider);
            await queryClient.invalidateQueries({ queryKey: queryKeys.integrationStatus(provider) });
            toast({ title: t('integration.disconnected', { provider: name }), status: 'info', duration: 3000 });
        } catch (err) {
            toast({
                title: t('integration.disconnectFailed', { provider: name }),
                description: apiErrorMessage(err, t),
                status: 'error',
                duration: 5000,
            });
        } finally {
            setIsDisconnecting(false);
        }
    };

    let badge: { label: string; color: string };
    if (!configured) badge = { label: t('integration.status.notConfigured'), color: 'gray' };
    else if (needsReconnect) badge = { label: t('integration.status.expired'), color: 'orange' };
    else if (status?.connected) badge = { label: t('integration.status.connected'), color: 'green' };
    else badge = { label: t('integration.status.notConnected'), color: 'gray' };

    return (
        <Card as="section" aria-labelledby={`integration-${provider}`} data-testid={`integration-${provider}`}>
            <CardBody>
                <Stack direction={{ base: 'column', sm: 'row' }} spacing={4} align={{ base: 'stretch', sm: 'center' }}>
                    <Flex align="flex-start" gap={3} flex="1" minW={0}>
                        <Flex
                            boxSize={10}
                            borderRadius="lg"
                            bg="brand.subtle"
                            color="brand.fg"
                            align="center"
                            justify="center"
                            flexShrink={0}
                            aria-hidden
                        >
                            <Icon size={20} />
                        </Flex>
                        <VStack align="stretch" spacing={1} minW={0}>
                            <HStack spacing={2} wrap="wrap">
                                <Heading as="h2" size="sm" id={`integration-${provider}`}>
                                    {name}
                                </Heading>
                                {isLoading ? <Skeleton h="18px" w="60px" /> : <Badge colorScheme={badge.color}>{badge.label}</Badge>}
                            </HStack>
                            <Text color="text.muted" fontSize="sm">
                                {t(`integration.providers.${provider}.description`)}
                            </Text>
                            {status?.connected && status.last_used_at && (
                                <Text color="text.muted" fontSize="xs">
                                    {t('integration.lastUsed', { date: formatDateTime(status.last_used_at) })}
                                </Text>
                            )}
                        </VStack>
                    </Flex>
                    {!isLoading && configured && (
                        <HStack spacing={2} justify="flex-end" flexShrink={0}>
                            {status?.connected && (
                                <Button
                                    variant="ghost"
                                    colorScheme="red"
                                    size="sm"
                                    onClick={handleDisconnect}
                                    isLoading={isDisconnecting}
                                >
                                    {t('integration.disconnect')}
                                </Button>
                            )}
                            {(!status?.connected || needsReconnect) && (
                                <Button size="sm" onClick={handleConnect} isLoading={isConnecting}>
                                    {needsReconnect ? t('integration.reconnect') : t('integration.connect')}
                                </Button>
                            )}
                        </HStack>
                    )}
                </Stack>
                {!configured && (
                    <Alert status="info" borderRadius="md" mt={4} fontSize="sm" data-testid={`integration-${provider}-not-configured`}>
                        <AlertIcon />
                        {t('integration.notConfigured', { provider: name })}
                    </Alert>
                )}
                {error && !status && (
                    <Alert status="error" borderRadius="md" mt={4} fontSize="sm">
                        <AlertIcon />
                        {t('integration.loadError', { reason: apiErrorMessage(error, t) })}
                    </Alert>
                )}
            </CardBody>
        </Card>
    );
}
