'use client';

import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react';
import { PageShell } from './PageShell';

export interface ContentSection {
    heading: string;
    paragraphs?: string[];
    items?: string[];
}

interface ContentPageProps {
    title: string;
    lead?: string;
    updatedAt?: string;
    sections: ContentSection[];
    children?: React.ReactNode;
}

/** Simple long-form text page (privacy policy, terms of service, ...) */
export function ContentPage({ title, lead, updatedAt, sections, children }: ContentPageProps) {
    return (
        <PageShell>
            <Container maxW="container.md" py={{ base: 8, md: 12 }}>
                <VStack as="article" align="stretch" spacing={8}>
                    <Box>
                        <Heading as="h1" size="xl" mb={3}>
                            {title}
                        </Heading>
                        {lead && <Text color="text.muted">{lead}</Text>}
                        {updatedAt && (
                            <Text fontSize="sm" color="text.muted" mt={2}>
                                {updatedAt}
                            </Text>
                        )}
                    </Box>
                    {sections.map((section) => (
                        <Box as="section" key={section.heading}>
                            <Heading as="h2" size="md" mb={3}>
                                {section.heading}
                            </Heading>
                            {section.paragraphs?.map((p) => (
                                <Text key={p} mb={3} lineHeight="tall">
                                    {p}
                                </Text>
                            ))}
                            {section.items && (
                                <Box as="ul" pl={6}>
                                    {section.items.map((item) => (
                                        <Box as="li" key={item} mb={1} lineHeight="tall">
                                            {item}
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    ))}
                    {children}
                </VStack>
            </Container>
        </PageShell>
    );
}
