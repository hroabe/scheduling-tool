'use client';

import {
    Box,
    Container,
    VStack,
    Heading,
    Accordion,
    AccordionItem,
    AccordionButton,
    AccordionPanel,
    AccordionIcon,
    Text,
    useColorModeValue,
} from '@chakra-ui/react';
import { useI18n } from '@/providers/I18nProvider';

export function FaqAccordion() {
    const { t } = useI18n();
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    const faqItems = [
        {
            question: t('home.faq1Question'),
            answer: t('home.faq1Answer'),
        },
        {
            question: t('home.faq2Question'),
            answer: t('home.faq2Answer'),
        },
        {
            question: t('home.faq3Question'),
            answer: t('home.faq3Answer'),
        },
        {
            question: t('home.faq4Question'),
            answer: t('home.faq4Answer'),
        },
    ];

    return (
        <Box id="faq" py={{ base: 6, md: 8 }}>
            <Container maxW="3xl">
                <VStack spacing={5}>
                    <Heading
                        fontSize={{ base: 'xl', md: '2xl' }}
                        fontWeight="semibold"
                        textAlign="center"
                    >
                        FAQ
                    </Heading>

                    <Accordion allowToggle w="full">
                        {faqItems.map((item, index) => (
                            <AccordionItem
                                key={index}
                                border="1px solid"
                                borderColor={borderColor}
                                borderRadius="md"
                                mb={2}
                                bg={cardBg}
                                overflow="hidden"
                            >
                                <AccordionButton
                                    py={3}
                                    px={4}
                                    _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                                >
                                    <Box flex="1" textAlign="left" fontSize="md" fontWeight="medium">
                                        {item.question}
                                    </Box>
                                    <AccordionIcon />
                                </AccordionButton>
                                <AccordionPanel pb={3} px={4}>
                                    <Text color="gray.600" fontSize="md" lineHeight="1.6">
                                        {item.answer}
                                    </Text>
                                </AccordionPanel>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </VStack>
            </Container>
        </Box>
    );
}
