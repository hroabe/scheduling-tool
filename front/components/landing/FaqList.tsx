'use client';

import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Box,
    Button,
    Container,
    Heading,
    Text,
    VStack,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import type { FaqItem } from '@/lib/faq';

export function FaqList({ items }: { items: FaqItem[] }) {
    return (
        <PageShell>
            <Container maxW="container.md" py={{ base: 8, md: 12 }}>
                <VStack align="stretch" spacing={8}>
                    <Box>
                        <Heading as="h1" size="xl" mb={3}>
                            よくある質問
                        </Heading>
                        <Text color="text.muted">日程調整ツールの使い方や機能についてのよくある質問です。</Text>
                    </Box>
                    <Accordion allowMultiple defaultIndex={[0]}>
                        {items.map((item) => (
                            <AccordionItem key={item.question}>
                                <h2>
                                    <AccordionButton py={4}>
                                        <Box as="span" flex="1" textAlign="left" fontWeight="semibold">
                                            Q. {item.question}
                                        </Box>
                                        <AccordionIcon />
                                    </AccordionButton>
                                </h2>
                                <AccordionPanel pb={5} color="text.muted" lineHeight="tall">
                                    {item.answer}
                                </AccordionPanel>
                            </AccordionItem>
                        ))}
                    </Accordion>
                    <VStack spacing={3} py={6}>
                        <Text fontWeight="semibold">さっそく日程調整を始めましょう</Text>
                        <Button as={NextLink} href="/create" size="lg" rightIcon={<ArrowRight size={18} />}>
                            イベントを作成する（無料）
                        </Button>
                    </VStack>
                </VStack>
            </Container>
        </PageShell>
    );
}
