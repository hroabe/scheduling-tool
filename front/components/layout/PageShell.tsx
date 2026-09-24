'use client';

import { Box, Flex } from '@chakra-ui/react';
import { Footer } from './Footer';
import { Header } from './Header';

/** Header + main landmark + Footer shared by every page */
export function PageShell({ children, showFooter = true }: { children: React.ReactNode; showFooter?: boolean }) {
    return (
        <Flex direction="column" minH="100vh">
            <Header />
            <Box as="main" id="main" flex="1" tabIndex={-1} _focus={{ outline: 'none' }}>
                {children}
            </Box>
            {showFooter && <Footer />}
        </Flex>
    );
}
