'use client';

import { Button, Container, Heading, Text, VStack } from '@chakra-ui/react';
import NextLink from 'next/link';
import { PageShell } from './PageShell';

interface StatusPageProps {
    code?: string;
    title: string;
    message: string;
    action?: { label: string; href?: string; onClick?: () => void };
}

/** Full-page message used by 404 / error / offline pages */
export function StatusPage({ code, title, message, action }: StatusPageProps) {
    return (
        <PageShell>
            <Container maxW="container.sm" py={{ base: 16, md: 24 }}>
                <VStack spacing={4} textAlign="center">
                    {code && (
                        <Text fontSize="6xl" fontWeight="bold" color="brand.fg" lineHeight={1}>
                            {code}
                        </Text>
                    )}
                    <Heading as="h1" size="lg">
                        {title}
                    </Heading>
                    <Text color="text.muted">{message}</Text>
                    <VStack pt={4} spacing={3}>
                        {action &&
                            (action.href ? (
                                <Button as={NextLink} href={action.href}>
                                    {action.label}
                                </Button>
                            ) : (
                                <Button onClick={action.onClick}>{action.label}</Button>
                            ))}
                        <Button as={NextLink} href="/" variant="link">
                            トップページへ戻る
                        </Button>
                    </VStack>
                </VStack>
            </Container>
        </PageShell>
    );
}
