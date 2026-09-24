'use client';

import { Box, Container, Divider, HStack, Link, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import NextLink from 'next/link';
import { siteConfig } from '@/lib/site';
import { useI18n } from '@/providers/I18nProvider';

export function Footer() {
    const { t } = useI18n();

    const productLinks = [
        { label: t('footer.create'), href: '/create' },
        { label: t('footer.oneOnOne'), href: '/booking/new' },
        { label: t('footer.howItWorks'), href: '/#how-it-works' },
        { label: t('footer.features'), href: '/#features' },
        { label: t('footer.faq'), href: '/faq' },
    ];
    const legalLinks = [
        { label: t('footer.terms'), href: '/terms' },
        { label: t('footer.privacy'), href: '/privacy' },
    ];

    return (
        <Box as="footer" bg="bg.card" borderTop="1px solid" borderColor="border.default" className="no-print">
            <Container maxW="container.xl" py={10}>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
                    <VStack align="start" spacing={2}>
                        <Text fontWeight="bold">{siteConfig.name}</Text>
                        <Text fontSize="sm" color="text.muted">
                            {t('footer.tagline')}
                        </Text>
                    </VStack>

                    <VStack as="nav" align="start" spacing={3} aria-label={t('footer.product')}>
                        <Text fontWeight="semibold" fontSize="sm">
                            {t('footer.product')}
                        </Text>
                        {productLinks.map((link) => (
                            <Link as={NextLink} key={link.href} href={link.href} color="text.muted" fontSize="sm">
                                {link.label}
                            </Link>
                        ))}
                    </VStack>

                    <VStack as="nav" align="start" spacing={3} aria-label={t('footer.legal')}>
                        <Text fontWeight="semibold" fontSize="sm">
                            {t('footer.legal')}
                        </Text>
                        {legalLinks.map((link) => (
                            <Link as={NextLink} key={link.href} href={link.href} color="text.muted" fontSize="sm">
                                {link.label}
                            </Link>
                        ))}
                        {siteConfig.contactEmail && (
                            <Link href={`mailto:${siteConfig.contactEmail}`} color="text.muted" fontSize="sm">
                                {t('footer.contact')}
                            </Link>
                        )}
                    </VStack>
                </SimpleGrid>

                <Divider my={8} />

                <HStack justify="space-between" flexWrap="wrap" spacing={4}>
                    <Text fontSize="sm" color="text.muted">
                        © {new Date().getFullYear()} {siteConfig.name}
                    </Text>
                    <Link as={NextLink} href="/?ref=powered_by" fontSize="sm" color="text.muted" data-testid="powered-by">
                        Powered by{' '}
                        <Text as="span" fontWeight="semibold" color="brand.fg">
                            {siteConfig.name}
                        </Text>
                    </Link>
                </HStack>
            </Container>
        </Box>
    );
}
