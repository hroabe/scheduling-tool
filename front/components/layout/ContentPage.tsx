'use client';

import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { useI18n } from '@/providers/I18nProvider';
import { PageShell } from './PageShell';

/**
 * A section of a long-form page. Every string is a message key (e.g. `legal.privacy.collect.p1`),
 * translated with `t(key, vars)`; strings that are not keys are rendered as-is.
 */
export interface ContentSection {
    heading: string;
    paragraphs?: string[];
    items?: string[];
}

interface ContentPageProps {
    title: string;
    lead?: string;
    updatedAt?: string;
    /** Shown only for non-Japanese locales (e.g. "the Japanese version prevails") */
    translationNote?: string;
    sections: ContentSection[];
    /** Interpolation values for `{name}` placeholders */
    vars?: Record<string, string | number>;
    children?: ReactNode;
}

/** Simple long-form text page (privacy policy, terms of service, ...) */
export function ContentPage({ title, lead, updatedAt, translationNote, sections, vars, children }: ContentPageProps) {
    const { t, locale } = useI18n();
    const tr = (key: string) => t(key, vars);

    return (
        <PageShell>
            <Container maxW="container.md" py={{ base: 8, md: 12 }}>
                <VStack as="article" align="stretch" spacing={8}>
                    <Box>
                        <Heading as="h1" size="xl" mb={3}>
                            {tr(title)}
                        </Heading>
                        {lead && <Text color="text.muted">{tr(lead)}</Text>}
                        {updatedAt && (
                            <Text fontSize="sm" color="text.muted" mt={2}>
                                {tr(updatedAt)}
                            </Text>
                        )}
                        {translationNote && locale !== 'ja' && (
                            <Text fontSize="sm" color="text.muted" mt={2}>
                                {tr(translationNote)}
                            </Text>
                        )}
                    </Box>
                    {sections.map((section) => (
                        <Box as="section" key={section.heading}>
                            <Heading as="h2" size="md" mb={3}>
                                {tr(section.heading)}
                            </Heading>
                            {section.paragraphs?.map((p) => (
                                <Text key={p} mb={3} lineHeight="tall">
                                    {tr(p)}
                                </Text>
                            ))}
                            {section.items && (
                                <Box as="ul" pl={6}>
                                    {section.items.map((item) => (
                                        <Box as="li" key={item} mb={1} lineHeight="tall">
                                            {tr(item)}
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
