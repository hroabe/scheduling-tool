'use client';

import {
    Box,
    Container,
    HStack,
    VStack,
    Text,
    Icon,
    useColorModeValue,
} from '@chakra-ui/react';
import { FileEdit, Share2, CheckCircle } from 'lucide-react';
import { useI18n } from '@/providers/I18nProvider';

export function StepsStrip() {
    const { t } = useI18n();
    const bgColor = useColorModeValue('gray.50', 'gray.800');

    const steps = [
        { icon: FileEdit, label: t('home.step1') },
        { icon: Share2, label: t('home.step2') },
        { icon: CheckCircle, label: t('home.step3') },
    ];

    return (
        <Box id="steps" bg={bgColor} py={{ base: 5, md: 6 }}>
            <Container maxW="6xl">
                <VStack spacing={3}>
                    <Text
                        fontSize={{ base: 'lg', md: 'xl' }}
                        fontWeight="semibold"
                        textAlign="center"
                    >
                        {t('home.stepsTitle')}
                    </Text>
                    
                    <HStack
                        spacing={{ base: 2, md: 6 }}
                        justify="center"
                    >
                        {steps.map((step, index) => (
                            <HStack key={index} spacing={{ base: 2, md: 4 }}>
                                <VStack spacing={1}>
                                    <Box
                                        p={2.5}
                                        borderRadius="md"
                                        bg="blue.50"
                                        color="blue.600"
                                    >
                                        <Icon as={step.icon} boxSize={{ base: 5, md: 6 }} />
                                    </Box>
                                    <Text
                                        fontSize={{ base: 'sm', md: 'md' }}
                                        fontWeight="medium"
                                        textAlign="center"
                                        whiteSpace="nowrap"
                                    >
                                        {step.label}
                                    </Text>
                                </VStack>
                                
                                {index < steps.length - 1 && (
                                    <Text
                                        fontSize="xl"
                                        color="gray.400"
                                        px={1}
                                    >
                                        →
                                    </Text>
                                )}
                            </HStack>
                        ))}
                    </HStack>

                    <Text fontSize="sm" color="gray.500" textAlign="center">
                        {t('home.stepsSubtext')}
                    </Text>
                </VStack>
            </Container>
        </Box>
    );
}
