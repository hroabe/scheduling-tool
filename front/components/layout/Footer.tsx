'use client';

import { Box, Container, Divider, HStack, Link, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import NextLink from 'next/link';
import { siteConfig } from '@/lib/site';

const footerLinks = {
    product: [
        { label: 'イベント作成', href: '/create' },
        { label: '使い方', href: '/#how-it-works' },
        { label: '機能紹介', href: '/#features' },
        { label: 'よくある質問', href: '/faq' },
    ],
    legal: [
        { label: '利用規約', href: '/terms' },
        { label: 'プライバシーポリシー', href: '/privacy' },
    ],
};

export function Footer() {
    return (
        <Box as="footer" bg="bg.card" borderTop="1px solid" borderColor="border.default" className="no-print">
            <Container maxW="container.xl" py={10}>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
                    <VStack align="start" spacing={2}>
                        <Text fontWeight="bold">{siteConfig.name}</Text>
                        <Text fontSize="sm" color="text.muted">
                            登録不要・無料の日程調整ツール。
                            <br />
                            結果はCSV・ICSで持ち出せます。
                        </Text>
                    </VStack>

                    <VStack as="nav" align="start" spacing={3} aria-label="プロダクト">
                        <Text fontWeight="semibold" fontSize="sm">
                            プロダクト
                        </Text>
                        {footerLinks.product.map((link) => (
                            <Link as={NextLink} key={link.href} href={link.href} color="text.muted" fontSize="sm">
                                {link.label}
                            </Link>
                        ))}
                    </VStack>

                    <VStack as="nav" align="start" spacing={3} aria-label="法的情報">
                        <Text fontWeight="semibold" fontSize="sm">
                            法的情報・お問い合わせ
                        </Text>
                        {footerLinks.legal.map((link) => (
                            <Link as={NextLink} key={link.href} href={link.href} color="text.muted" fontSize="sm">
                                {link.label}
                            </Link>
                        ))}
                        {siteConfig.contactEmail && (
                            <Link href={`mailto:${siteConfig.contactEmail}`} color="text.muted" fontSize="sm">
                                お問い合わせ
                            </Link>
                        )}
                    </VStack>
                </SimpleGrid>

                <Divider my={8} />

                <HStack justify="space-between" flexWrap="wrap" spacing={4}>
                    <Text fontSize="sm" color="text.muted">
                        © {new Date().getFullYear()} {siteConfig.name}
                    </Text>
                    <Link
                        as={NextLink}
                        href="/?ref=powered_by"
                        fontSize="sm"
                        color="text.muted"
                        data-testid="powered-by"
                    >
                        Powered by <Text as="span" fontWeight="semibold" color="brand.fg">{siteConfig.name}</Text>
                    </Link>
                </HStack>
            </Container>
        </Box>
    );
}
