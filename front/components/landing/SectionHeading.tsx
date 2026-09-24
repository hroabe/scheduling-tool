'use client';

import { Heading, Text, VStack } from '@chakra-ui/react';

/** Centered h2 + lead used by landing page sections (the id is referenced by aria-labelledby) */
export function SectionHeading({ id, title, lead }: { id: string; title: string; lead?: string }) {
    return (
        <VStack spacing={3} textAlign="center" mb={10}>
            <Heading as="h2" id={id} size="xl">
                {title}
            </Heading>
            {lead && (
                <Text fontSize="lg" color="text.muted" maxW="2xl">
                    {lead}
                </Text>
            )}
        </VStack>
    );
}
