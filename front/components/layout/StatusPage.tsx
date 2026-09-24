'use client';

import { Button, Container, Heading, Text, VStack } from '@chakra-ui/react';
import NextLink from 'next/link';
import { useI18n } from '@/providers/I18nProvider';
import { PageShell } from './PageShell';

interface StatusPageProps {
    code?: string;
    /** Message key (or literal text) */
    title: string;
    /** Message key (or literal text) */
    message: string;
    /** `label` is a message key (or literal text) */
    action?: { label: string; href?: string; onClick?: () => void };
}

/** Full-page message used by 404 / error / offline pages */
export function StatusPage({ code, title, message, action }: StatusPageProps) {
    const { t } = useI18n();

    return (
        <PageShell>
            <Container maxW="container.sm" py={{ base: 16, md: 24 }}>
                <VStack spacing={4} textAlign="center">
                    {code && (
                        <Text fontSize="6xl" fontWeight="bold" color="brand.fg" lineHeight={1} aria-hidden="true">
                            {code}
                        </Text>
                    )}
                    <Heading as="h1" size="lg">
                        {t(title)}
                    </Heading>
                    <Text color="text.muted">{t(message)}</Text>
                    <VStack pt={4} spacing={3}>
                        {action &&
                            (action.href ? (
                                <Button as={NextLink} href={action.href}>
                                    {t(action.label)}
                                </Button>
                            ) : (
                                <Button onClick={action.onClick}>{t(action.label)}</Button>
                            ))}
                        <Button as={NextLink} href="/" variant="link">
                            {t('home.backToHome')}
                        </Button>
                    </VStack>
                </VStack>
            </Container>
        </PageShell>
    );
}
