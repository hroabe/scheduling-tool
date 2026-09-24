'use client';

import { Card, CardBody, Container, Heading, Text, VStack } from '@chakra-ui/react';
import type { ReactNode } from 'react';

/** Narrow centered card shared by the login / register / callback pages */
export function AuthCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <Container maxW="md" py={{ base: 8, md: 16 }} px={4}>
            <Card>
                <CardBody p={{ base: 6, md: 8 }}>
                    <VStack spacing={6} align="stretch">
                        <VStack spacing={2} textAlign="center">
                            <Heading as="h1" size="lg">
                                {title}
                            </Heading>
                            {description && (
                                <Text color="text.muted" fontSize="sm">
                                    {description}
                                </Text>
                            )}
                        </VStack>
                        {children}
                    </VStack>
                </CardBody>
            </Card>
        </Container>
    );
}
