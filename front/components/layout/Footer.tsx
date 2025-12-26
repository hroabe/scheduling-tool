'use client';

import {
    Box,
    Container,
    SimpleGrid,
    VStack,
    HStack,
    Text,
    Link,
    Icon,
    useColorModeValue,
    Divider,
} from '@chakra-ui/react';
import { Heart, Github, Twitter, Mail } from 'lucide-react';

const footerLinks = {
    product: [
        { label: 'イベント作成', href: '/create' },
        { label: '機能紹介', href: '/#features' },
        { label: 'よくある質問', href: '/faq' },
    ],
    legal: [
        { label: '利用規約', href: '/terms' },
        { label: 'プライバシーポリシー', href: '/privacy' },
    ],
    social: [
        { label: 'GitHub', href: 'https://github.com', icon: Github },
        { label: 'Twitter', href: 'https://twitter.com', icon: Twitter },
        { label: 'お問い合わせ', href: 'mailto:contact@example.com', icon: Mail },
    ],
};

export function Footer() {
    const bg = useColorModeValue('gray.50', 'gray.900');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const mutedColor = useColorModeValue('gray.600', 'gray.400');

    return (
        <Box as="footer" bg={bg} borderTop="1px solid" borderColor={borderColor}>
            <Container maxW="container.xl" py={12}>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
                    {/* Product Links */}
                    <VStack align="start" spacing={4}>
                        <Text fontWeight="semibold">プロダクト</Text>
                        {footerLinks.product.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                color={mutedColor}
                                _hover={{ color: 'brand.500' }}
                                fontSize="sm"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </VStack>

                    {/* Legal Links */}
                    <VStack align="start" spacing={4}>
                        <Text fontWeight="semibold">法的情報</Text>
                        {footerLinks.legal.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                color={mutedColor}
                                _hover={{ color: 'brand.500' }}
                                fontSize="sm"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </VStack>

                    {/* Social Links */}
                    <VStack align="start" spacing={4}>
                        <Text fontWeight="semibold">ソーシャル</Text>
                        {footerLinks.social.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                color={mutedColor}
                                _hover={{ color: 'brand.500' }}
                                fontSize="sm"
                                isExternal={link.href.startsWith('http') || link.href.startsWith('mailto')}
                            >
                                <HStack spacing={2}>
                                    <Icon as={link.icon} boxSize={4} />
                                    <span>{link.label}</span>
                                </HStack>
                            </Link>
                        ))}
                    </VStack>
                </SimpleGrid>

                <Divider my={8} />

                <HStack justify="space-between" flexWrap="wrap" spacing={4}>
                    <Text fontSize="sm" color={mutedColor}>
                        © {new Date().getFullYear()} 日程調整ツール. All rights reserved.
                    </Text>
                    <HStack spacing={1} fontSize="sm" color={mutedColor}>
                        <Text>Made with</Text>
                        <Icon as={Heart} boxSize={4} color="red.400" fill="currentColor" />
                        <Text>in Japan</Text>
                    </HStack>
                </HStack>
            </Container>
        </Box>
    );
}
