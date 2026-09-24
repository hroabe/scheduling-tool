'use client';

/**
 * SegmentedTabs - pill-style (segmented) tabs
 *
 * - Uses semantic tokens only, so it works in light / dark / cute themes
 * - Visible focus ring, 44px touch targets
 * - Scrolls horizontally on narrow screens instead of wrapping
 *
 * Use <SegmentedTabs tabs=[...]/> for simple cases, or compose
 * <Tabs variant="unstyled"><SegmentedTabList><SegmentedTab/>...</SegmentedTabList>...</Tabs>.
 */

import { Tab, TabList, TabPanel, TabPanels, Tabs, type TabProps, type TabsProps } from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface SegmentedTabItem {
    label: ReactNode;
    content: ReactNode;
}

interface SegmentedTabsProps extends Omit<TabsProps, 'children'> {
    tabs: SegmentedTabItem[];
    isFitted?: boolean;
}

export function SegmentedTabList({
    children,
    isFitted = true,
    className,
}: {
    children: ReactNode;
    isFitted?: boolean;
    className?: string;
}) {
    return (
        <TabList
            className={className}
            display="flex"
            gap={1}
            p={1}
            border="1px solid"
            borderColor="border.default"
            borderRadius="lg"
            bg="bg.card"
            boxShadow="sm"
            w={isFitted ? '100%' : 'fit-content'}
            maxW="100%"
            overflowX="auto"
        >
            {children}
        </TabList>
    );
}

export function SegmentedTab({ children, ...props }: TabProps) {
    return (
        <Tab
            px={4}
            py={2}
            minH="44px"
            flexShrink={0}
            whiteSpace="nowrap"
            borderRadius="md"
            fontWeight="semibold"
            fontSize="sm"
            color="text.muted"
            bg="transparent"
            transition="background 0.2s, color 0.2s"
            _hover={{ bg: 'bg.subtle' }}
            _selected={{ bg: 'brand.subtle', color: 'brand.fg' }}
            _focusVisible={{ boxShadow: 'outline', outline: 'none' }}
            {...props}
        >
            {children}
        </Tab>
    );
}

export function SegmentedTabs({ tabs, isFitted = true, ...tabsProps }: SegmentedTabsProps) {
    return (
        <Tabs variant="unstyled" isFitted={isFitted} {...tabsProps}>
            <SegmentedTabList isFitted={isFitted}>
                {tabs.map((tab, index) => (
                    <SegmentedTab key={index}>{tab.label}</SegmentedTab>
                ))}
            </SegmentedTabList>
            <TabPanels>
                {tabs.map((tab, index) => (
                    <TabPanel key={index} px={0} pt={6}>
                        {tab.content}
                    </TabPanel>
                ))}
            </TabPanels>
        </Tabs>
    );
}
