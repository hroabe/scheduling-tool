'use client';

import { Box, Button, Container, Flex, Heading, Icon, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import NextLink from 'next/link';
import {
    ArrowRight,
    BellRing,
    CalendarPlus,
    CalendarSync,
    FileSpreadsheet,
    Languages,
    PencilLine,
    Smartphone,
    Sparkles,
    UserX,
    Video,
    type LucideIcon,
} from 'lucide-react';
import { useAvailabilitySymbols } from '@/lib/availabilitySymbols';
import { useI18n } from '@/providers/I18nProvider';
import { SectionHeading } from './SectionHeading';

const MotionBox = motion.create(Box);

/** Core features (no login needed); `n` maps to `home.feature{n}Title` / `home.feature{n}Desc` */
const coreFeatures: { n: number; icon: LucideIcon }[] = [
    { n: 1, icon: UserX },
    { n: 2, icon: FileSpreadsheet },
    { n: 3, icon: CalendarPlus },
    { n: 4, icon: PencilLine },
    { n: 5, icon: Sparkles },
    { n: 6, icon: Smartphone },
];

/** Additional features (calendar integration etc.); maps to `home.advFeature{n}Title` / `Desc` */
const advancedFeatures: { n: number; icon: LucideIcon }[] = [
    { n: 1, icon: CalendarSync },
    { n: 2, icon: Video },
    { n: 3, icon: BellRing },
    { n: 4, icon: Languages },
];

function FeatureIcon({ icon }: { icon: LucideIcon }) {
    return (
        <Flex align="center" justify="center" w={12} h={12} mb={4} borderRadius="lg" bg="brand.subtle" color="brand.fg">
            <Icon as={icon} boxSize={6} aria-hidden="true" />
        </Flex>
    );
}

export function FeatureSection() {
    const { t } = useI18n();
    const symbols = useAvailabilitySymbols();

    return (
        <Box as="section" id="features" py={{ base: 16, md: 20 }} aria-labelledby="features-heading">
            <Container maxW="container.xl">
                <SectionHeading id="features-heading" title={t('home.featuresTitle')} lead={t('home.featuresLead')} />
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                    {coreFeatures.map((feature, index) => (
                        <MotionBox
                            key={feature.n}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                            <Box
                                as="article"
                                p={6}
                                h="full"
                                bg="bg.card"
                                borderRadius="xl"
                                border="1px solid"
                                borderColor="border.default"
                                _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
                                transition="all 0.2s"
                            >
                                <FeatureIcon icon={feature.icon} />
                                <Heading as="h3" size="md" mb={2}>
                                    {t(`home.feature${feature.n}Title`)}
                                </Heading>
                                <Text color="text.muted">{t(`home.feature${feature.n}Desc`, { symbols: symbols.label })}</Text>
                            </Box>
                        </MotionBox>
                    ))}
                </SimpleGrid>

                <Box
                    mt={{ base: 12, md: 16 }}
                    p={{ base: 6, md: 10 }}
                    bg="bg.subtle"
                    borderRadius="2xl"
                    aria-labelledby="advanced-features-heading"
                    role="group"
                >
                    <VStack spacing={3} textAlign="center" mb={8}>
                        <Heading as="h3" id="advanced-features-heading" size="lg">
                            {t('home.advancedFeatures')}
                        </Heading>
                        <Text color="text.muted" maxW="2xl">
                            {t('home.advancedFeaturesDesc')}
                        </Text>
                    </VStack>
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
                        {advancedFeatures.map((feature) => (
                            <Box
                                as="article"
                                key={feature.n}
                                p={6}
                                bg="bg.card"
                                borderRadius="xl"
                                border="1px solid"
                                borderColor="border.default"
                            >
                                <FeatureIcon icon={feature.icon} />
                                <Heading as="h4" size="sm" mb={2}>
                                    {t(`home.advFeature${feature.n}Title`)}
                                </Heading>
                                <Text color="text.muted" fontSize="sm">
                                    {t(`home.advFeature${feature.n}Desc`)}
                                </Text>
                            </Box>
                        ))}
                    </SimpleGrid>
                    <Flex justify="center" mt={8}>
                        <Button as={NextLink} href="/register" variant="outline" rightIcon={<ArrowRight size={16} />}>
                            {t('home.advancedCta')}
                        </Button>
                    </Flex>
                </Box>
            </Container>
        </Box>
    );
}
