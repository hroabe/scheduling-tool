'use client';

import {
    Box,
    Container,
    VStack,
    Button,
} from '@chakra-ui/react';
import Link from 'next/link';
import { useI18n } from '@/providers/I18nProvider';

export function FinalCta() {
    const { t } = useI18n();

    return (
        <Box
            bgGradient="linear(to-r, blue.400, blue.500)"
            py={{ base: 8, md: 10 }}
            color="white"
        >
            <Container maxW="2xl">
                <VStack spacing={4} textAlign="center">
                    <Button
                        as={Link}
                        href="/create"
                        size="lg"
                        bg="white"
                        color="blue.600"
                        fontWeight="semibold"
                        fontSize="md"
                        px={8}
                        _hover={{
                            bg: 'gray.100',
                            transform: 'translateY(-2px)',
                            boxShadow: 'lg',
                        }}
                        transition="all 0.2s"
                    >
                        {t('home.primaryCta')}
                    </Button>
                </VStack>
            </Container>
        </Box>
    );
}
