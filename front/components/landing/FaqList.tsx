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
    Stack,
    Text,
    VStack,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { faqKeys, getFaqItems } from '@/lib/faq';
import { useI18n } from '@/providers/I18nProvider';

/** Full FAQ page (/faq), translated into the current UI language */
export function FaqList() {
    const { t } = useI18n();
    const items = getFaqItems(t, faqKeys);

    return (
        <PageShell>
            <Container maxW="container.md" py={{ base: 8, md: 12 }}>
                <VStack align="stretch" spacing={8}>
                    <Box>
                        <Heading as="h1" size="xl" mb={3}>
                            {t('faq.title')}
                        </Heading>
                        <Text color="text.muted">{t('faq.lead')}</Text>
                    </Box>
                    <Accordion allowMultiple defaultIndex={[0]}>
                        {items.map((item) => (
                            <AccordionItem key={item.key} id={`faq-${item.key}`}>
                                <h2>
                                    <AccordionButton py={4}>
                                        <Box as="span" flex="1" textAlign="left" fontWeight="semibold">
                                            {t('faq.questionPrefix')} {item.question}
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
                        <Text fontWeight="semibold">{t('faq.ctaLead')}</Text>
                        <Stack direction={{ base: 'column', sm: 'row' }} spacing={3} w={{ base: 'full', sm: 'auto' }}>
                            <Button as={NextLink} href="/create" size="lg" rightIcon={<ArrowRight size={18} />}>
                                {t('faq.ctaCreate')}
                            </Button>
                            <Button as={NextLink} href="/booking/new" size="lg" variant="outline">
                                {t('faq.ctaBooking')}
                            </Button>
                        </Stack>
                    </VStack>
                </VStack>
            </Container>
        </PageShell>
    );
}
