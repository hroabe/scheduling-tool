'use client';

/**
 * SegmentedTabs - Pill-style (segmented) tab component
 * 
 * Features:
 * - Pill-shaped container with border and shadow
 * - Uniform button-like tabs
 * - Blue highlight for selected state
 * - Focus visibility for accessibility
 * - Mobile-friendly with isFitted option
 */

import {
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    TabsProps,
    useColorModeValue,
} from '@chakra-ui/react';
import { ReactNode } from 'react';

interface SegmentedTabItem {
    label: string;
    content: ReactNode;
}

interface SegmentedTabsProps extends Omit<TabsProps, 'children'> {
    tabs: SegmentedTabItem[];
    isFitted?: boolean;
}

export function SegmentedTabs({
    tabs,
    isFitted = true,
    ...tabsProps
}: SegmentedTabsProps) {
    const containerBg = useColorModeValue('white', 'gray.800');
    const containerBorder = useColorModeValue('gray.200', 'gray.600');
    const selectedBg = useColorModeValue('blue.50', 'blue.900');
    const selectedColor = useColorModeValue('blue.700', 'blue.200');
    const unselectedColor = useColorModeValue('gray.700', 'gray.300');
    const hoverBg = useColorModeValue('gray.50', 'gray.700');

    return (
        <Tabs variant="unstyled" isFitted={isFitted} {...tabsProps}>
            <TabList
                display="inline-flex"
                gap={1}
                p={1}
                border="1px solid"
                borderColor={containerBorder}
                borderRadius="lg"
                bg={containerBg}
                boxShadow="sm"
                mb={4}
                w={isFitted ? '100%' : 'auto'}
            >
                {tabs.map((tab, index) => (
                    <Tab
                        key={index}
                        px={4}
                        py={2}
                        minH="44px"
                        borderRadius="md"
                        fontWeight="semibold"
                        fontSize="sm"
                        color={unselectedColor}
                        bg="transparent"
                        transition="all 0.2s"
                        _hover={{
                            bg: hoverBg,
                        }}
                        _selected={{
                            bg: selectedBg,
                            color: selectedColor,
                        }}
                        _focusVisible={{
                            boxShadow: '0 0 0 3px rgba(66,153,225,0.35)',
                            outline: 'none',
                        }}
                    >
                        {tab.label}
                    </Tab>
                ))}
            </TabList>
            <TabPanels>
                {tabs.map((tab, index) => (
                    <TabPanel key={index} p={0}>
                        {tab.content}
                    </TabPanel>
                ))}
            </TabPanels>
        </Tabs>
    );
}

// Export individual styled components for more flexible usage
export function SegmentedTabList({
    children,
    isFitted = true,
}: {
    children: ReactNode;
    isFitted?: boolean;
}) {
    const containerBg = useColorModeValue('white', 'gray.800');
    const containerBorder = useColorModeValue('gray.200', 'gray.600');

    return (
        <TabList
            display="inline-flex"
            gap={1}
            p={1}
            border="1px solid"
            borderColor={containerBorder}
            borderRadius="lg"
            bg={containerBg}
            boxShadow="sm"
            mb={4}
            w={isFitted ? '100%' : 'auto'}
        >
            {children}
        </TabList>
    );
}

export function SegmentedTab({ children }: { children: ReactNode }) {
    const selectedBg = useColorModeValue('blue.50', 'blue.900');
    const selectedColor = useColorModeValue('blue.700', 'blue.200');
    const unselectedColor = useColorModeValue('gray.700', 'gray.300');
    const hoverBg = useColorModeValue('gray.50', 'gray.700');

    return (
        <Tab
            px={4}
            py={2}
            minH="44px"
            borderRadius="md"
            fontWeight="semibold"
            fontSize="sm"
            color={unselectedColor}
            bg="transparent"
            transition="all 0.2s"
            _hover={{
                bg: hoverBg,
            }}
            _selected={{
                bg: selectedBg,
                color: selectedColor,
            }}
            _focusVisible={{
                boxShadow: '0 0 0 3px rgba(66,153,225,0.35)',
                outline: 'none',
            }}
        >
            {children}
        </Tab>
    );
}
