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
    useBreakpointValue,
} from '@chakra-ui/react';
import { Share2, CheckCircle, Clock, Bell, Globe, Shield } from 'lucide-react';
import { useI18n } from '@/providers/I18nProvider';

export function FeatureGrid() {
    const { t, locale } = useI18n();
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const sectionBg = useColorModeValue('gray.50', 'gray.900');

    // Short titles for mobile to prevent awkward line breaks
    const isMobile = useBreakpointValue({ base: true, md: false });
    
    // Use ○△× for Japanese/Korean, ✓?× for others
    const responseSymbol = (locale === 'ja' || locale === 'ko') ? '○△×' : '✓?×';

    const features = [
        {
            icon: Share2,
            title: t('home.feature1Title'),
            shortTitle: isMobile ? 'URL即回答' : t('home.feature1Title'),
            desc: t('home.feature1Desc'),
        },
        {
            icon: CheckCircle,
            title: t('home.feature2Title'),
            shortTitle: isMobile ? `${responseSymbol}` : t('home.feature2Title'),
            desc: t('home.feature2Desc'),
        },
        {
            icon: Clock,
            title: t('home.feature3Title'),
            shortTitle: isMobile ? '自動集計' : t('home.feature3Title'),
            desc: t('home.feature3Desc'),
        },
        {
            icon: Bell,
            title: t('home.feature4Title'),
            shortTitle: isMobile ? '期限&通知' : t('home.feature4Title'),
            desc: t('home.feature4Desc'),
        },
        {
            icon: Globe,
            title: t('home.feature5Title'),
            shortTitle: isMobile ? '多言語' : t('home.feature5Title'),
            desc: t('home.feature5Desc'),
        },
        {
            icon: Shield,
            title: t('home.feature6Title'),
            shortTitle: isMobile ? 'セキュア' : t('home.feature6Title'),
            desc: t('home.feature6Desc'),
        },
    ];

    return (
        <Box id="features" py={{ base: 6, md: 8 }} bg={sectionBg}>
            <Container maxW="6xl">
                <VStack spacing={5}>
                    <Heading
                        fontSize={{ base: 'xl', md: '2xl' }}
                        fontWeight="semibold"
                        textAlign="center"
                    >
                        {t('home.featuresTitle')}
                    </Heading>

                    <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3} w="full">
                        {features.map((feature, index) => (
                            <Box
                                key={index}
                                p={4}
                                bg={cardBg}
                                borderRadius="lg"
                                border="1px solid"
                                borderColor={borderColor}
                                boxShadow="sm"
                                textAlign="center"
                            >
                                <VStack spacing={2}>
                                    <Box
                                        p={2.5}
                                        borderRadius="lg"
                                        bg="blue.50"
                                        color="blue.500"
                                    >
                                        <Icon as={feature.icon} boxSize={5} />
                                    </Box>
                                    {/* Use short title on mobile to prevent awkward wrapping */}
                                    <Text 
                                        fontSize="sm" 
                                        fontWeight="medium"
                                        whiteSpace="nowrap"
                                    >
                                        {feature.shortTitle}
                                    </Text>
                                    {/* P2: Add 1-line description */}
                                    <Text
                                        fontSize="xs"
                                        color="gray.500"
                                        noOfLines={1}
                                        display={{ base: 'none', md: 'block' }}
                                    >
                                        {feature.desc}
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
