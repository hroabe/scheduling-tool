'use client';

import {
    Box,
    Button,
    Container,
    Flex,
    HStack,
    IconButton,
    Link as ChakraLink,
    Text,
    useColorMode,
    useColorModeValue,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { Calendar, Moon, Plus, Sun } from 'lucide-react';
import { siteConfig } from '@/lib/site';

export function Header() {
    const { colorMode, toggleColorMode } = useColorMode();
    const bg = useColorModeValue('rgba(255, 255, 255, 0.9)', 'rgba(26, 32, 44, 0.85)');

    return (
        <Box
            as="header"
            position="sticky"
            top={0}
            zIndex={100}
            bg={bg}
            backdropFilter="saturate(180%) blur(10px)"
            borderBottom="1px solid"
            borderColor="border.default"
            className="no-print"
        >
            <ChakraLink
                href="#main"
                position="absolute"
                left="-9999px"
                _focus={{ left: 2, top: 2, zIndex: 200, bg: 'bg.card', p: 2, borderRadius: 'md' }}
            >
                本文へスキップ
            </ChakraLink>
            <Container maxW="container.xl">
                <Flex h={16} align="center" justify="space-between">
                    <ChakraLink as={NextLink} href="/" _hover={{ textDecoration: 'none' }} aria-label={`${siteConfig.name} トップへ`}>
                        <HStack spacing={2}>
                            <Box p={2} borderRadius="lg" bg="brand.500" color="white" aria-hidden>
                                <Calendar size={20} />
                            </Box>
                            <Text as="span" fontSize={{ base: 'md', md: 'lg' }} fontWeight="bold">
                                {siteConfig.name}
                            </Text>
                        </HStack>
                    </ChakraLink>

                    <HStack as="nav" spacing={{ base: 1, md: 3 }} aria-label="メインナビゲーション">
                        <Button
                            as={NextLink}
                            href="/faq"
                            variant="ghost"
                            size="sm"
                            display={{ base: 'none', md: 'inline-flex' }}
                        >
                            よくある質問
                        </Button>
                        <Button as={NextLink} href="/create" size="sm" leftIcon={<Plus size={16} />}>
                            新規作成
                        </Button>
                        <IconButton
                            aria-label={colorMode === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}
                            icon={colorMode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                            onClick={toggleColorMode}
                            variant="ghost"
                            colorScheme="gray"
                            size="sm"
                        />
                    </HStack>
                </Flex>
            </Container>
        </Box>
    );
}
