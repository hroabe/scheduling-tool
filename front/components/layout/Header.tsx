'use client';

import {
    Box,
    Flex,
    Container,
    HStack,
    Button,
    IconButton,
    useColorMode,
    useColorModeValue,
    Heading,
    Link as ChakraLink,
} from '@chakra-ui/react';
import Link from 'next/link';
import { Sun, Moon, Github, Calendar } from 'lucide-react';

export function Header() {
    const { colorMode, toggleColorMode } = useColorMode();
    const bg = useColorModeValue('whiteAlpha.900', 'blackAlpha.700');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    return (
        <Box
            as="header"
            position="sticky"
            top={0}
            zIndex={100}
            bg={bg}
            backdropFilter="blur(10px)"
            borderBottom="1px solid"
            borderColor={borderColor}
        >
            <Container maxW="container.xl">
                <Flex h={16} align="center" justify="space-between">
                    {/* Logo */}
                    <Link href="/" passHref>
                        <HStack spacing={2} cursor="pointer">
                            <Box
                                p={2}
                                borderRadius="lg"
                                bg="brand.500"
                                color="white"
                            >
                                <Calendar size={20} />
                            </Box>
                            <Heading size="md" fontWeight="bold">
                                日程調整ツール
                            </Heading>
                        </HStack>
                    </Link>

                    {/* Navigation */}
                    <HStack spacing={4}>
                        <Button
                            as={Link}
                            href="/create"
                            colorScheme="brand"
                            size="sm"
                        >
                            新規作成
                        </Button>

                        <IconButton
                            aria-label="Toggle color mode"
                            icon={colorMode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                            onClick={toggleColorMode}
                            variant="ghost"
                            size="sm"
                        />

                        <ChakraLink
                            href="https://github.com"
                            isExternal
                            _hover={{ color: 'brand.500' }}
                        >
                            <IconButton
                                aria-label="GitHub"
                                icon={<Github size={18} />}
                                variant="ghost"
                                size="sm"
                            />
                        </ChakraLink>
                    </HStack>
                </Flex>
            </Container>
        </Box>
    );
}
