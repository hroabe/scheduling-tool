'use client';

import {
    Box,
    Container,
    SimpleGrid,
    VStack,
    Heading,
    Text,
    Icon,
    useColorModeValue,
} from '@chakra-ui/react';
import { Users, PartyPopper, UserCheck } from 'lucide-react';
import { useI18n } from '@/providers/I18nProvider';

export function UseCaseCards() {
    const { t } = useI18n();
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    const useCases = [
        {
            icon: Users,
            title: t('home.useCase1Title'),
            description: t('home.useCase1Desc'),
        },
        {
            icon: PartyPopper,
            title: t('home.useCase2Title'),
            description: t('home.useCase2Desc'),
        },
        {
            icon: UserCheck,
            title: t('home.useCase3Title'),
            description: t('home.useCase3Desc'),
        },
    ];

    return (
        <Box py={{ base: 6, md: 8 }}>
            <Container maxW="6xl">
                <VStack spacing={5}>
                    <Heading
                        fontSize={{ base: 'xl', md: '2xl' }}
                        fontWeight="semibold"
                        textAlign="center"
                    >
                        {t('home.useCasesTitle')}
                    </Heading>

                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} w="full">
                        {useCases.map((useCase, index) => (
                            <Box
                                key={index}
                                p={5}
                                bg={cardBg}
                                borderRadius="lg"
                                border="1px solid"
                                borderColor={borderColor}
                                boxShadow="sm"
                                _hover={{
                                    transform: 'translateY(-2px)',
                                    boxShadow: 'md',
                                }}
                                transition="all 0.2s"
                                textAlign="center"
                            >
                                <VStack spacing={3}>
                                    <Box
                                        p={2.5}
                                        borderRadius="lg"
                                        bg="blue.50"
                                        color="blue.500"
                                    >
                                        <Icon as={useCase.icon} boxSize={6} />
                                    </Box>
                                    <Heading size="md" whiteSpace="nowrap">
                                        {useCase.title}
                                    </Heading>
                                    {/* P2: noOfLines for consistent card heights */}
                                    <Text 
                                        fontSize="sm" 
                                        color="gray.600" 
                                        lineHeight="1.6"
                                        noOfLines={2}
                                    >
                                        {useCase.description}
                                    </Text>
                                </VStack>
                            </Box>
                        ))}
                    </SimpleGrid>
                </VStack>
            </Container>
        </Box>
    );
}
