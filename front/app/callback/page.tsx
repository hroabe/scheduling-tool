'use client';

/**
 * OIDC Callback Page
 * RFC-0011: Keycloak認証統合
 * 
 * Handles the OAuth2/OIDC callback after Keycloak authentication
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Container, VStack, Spinner, Text, Alert, AlertIcon } from '@chakra-ui/react';
import { keycloakConfig, exchangeCodeForTokens } from '@/lib/keycloak';
import { useAuthStore } from '@/stores/authStore';

export default function CallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const { setTokens, checkAuth } = useAuthStore();

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('code');
            const errorParam = searchParams.get('error');
            const errorDescription = searchParams.get('error_description');

            if (errorParam) {
                setError(errorDescription || errorParam);
                return;
            }

            if (!code) {
                setError('Authorization code not found');
                return;
            }

            try {
                const redirectUri = `${window.location.origin}/callback`;
                
                // Retrieve PKCE code verifier from sessionStorage
                const codeVerifier = sessionStorage.getItem('pkce_verifier');
                if (!codeVerifier) {
                    setError('PKCE verifier not found. Please try logging in again.');
                    return;
                }
                
                const tokens = await exchangeCodeForTokens(keycloakConfig, code, redirectUri, codeVerifier);
                
                // Clean up sessionStorage
                sessionStorage.removeItem('pkce_verifier');
                sessionStorage.removeItem('oauth_state');
                
                // Store tokens
                setTokens({
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    idToken: tokens.id_token,
                    expiresAt: Date.now() + tokens.expires_in * 1000,
                });

                // Fetch user info
                await checkAuth();

                // Redirect to account page
                router.push('/account');
            } catch (err) {
                console.error('Token exchange failed:', err);
                setError('認証に失敗しました。もう一度お試しください。');
            }
        };

        handleCallback();
    }, [searchParams, router, setTokens, checkAuth]);

    if (error) {
        return (
            <Container maxW="container.sm" py={20}>
                <Alert status="error" borderRadius="lg">
                    <AlertIcon />
                    <Box>
                        <Text fontWeight="bold">認証エラー</Text>
                        <Text>{error}</Text>
                    </Box>
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxW="container.sm" py={20}>
            <VStack spacing={4}>
                <Spinner size="xl" color="brand.500" />
                <Text>認証処理中...</Text>
            </VStack>
        </Container>
    );
}
