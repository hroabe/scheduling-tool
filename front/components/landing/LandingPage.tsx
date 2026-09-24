'use client';

import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Badge,
    Box,
    Button,
    Container,
    Flex,
    Heading,
    HStack,
    Icon,
    Link,
    List,
    ListIcon,
    ListItem,
    SimpleGrid,
    Stack,
    Text,
    VStack,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import {
    ArrowRight,
    Briefcase,
    CalendarCheck,
    CheckCircle2,
    Handshake,
    Link2,
    Presentation,
    Share2,
    Users,
    type LucideIcon,
} from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { getFaqItems, landingFaqKeys } from '@/lib/faq';
import { useI18n } from '@/providers/I18nProvider';
import { FeatureSection } from './FeatureSection';
import { HeroSection } from './HeroSection';
import { ModeSelector } from './ModeSelector';
import { SectionHeading } from './SectionHeading';

/** `n` maps to `home.step{n}` / `home.step{n}Desc` */
const steps: { n: number; icon: LucideIcon }[] = [
    { n: 1, icon: CalendarCheck },
    { n: 2, icon: Share2 },
    { n: 3, icon: CheckCircle2 },
];

/** `n` maps to `home.useCase{n}Title` / `Desc` / `Item1..3` */
const useCases: { n: number; icon: LucideIcon }[] = [
    { n: 1, icon: Presentation },
    { n: 2, icon: Briefcase },
    { n: 3, icon: Users },
    { n: 4, icon: Handshake },
];

const itemNumbers = [1, 2, 3];

function HowItWorksSection() {
    const { t } = useI18n();
    return (
        <Box as="section" id="how-it-works" py={{ base: 16, md: 20 }} bg="bg.card" aria-labelledby="how-it-works-heading">
            <Container maxW="container.lg">
                <SectionHeading id="how-it-works-heading" title={t('home.stepsTitle')} lead={t('home.stepsLead')} />
                <SimpleGrid as="ol" columns={{ base: 1, md: 3 }} spacing={8} listStyleType="none">
                    {steps.map((step) => (
                        <VStack as="li" key={step.n} spacing={3} textAlign="center">
                            <Flex
                                align="center"
                                justify="center"
                                w={16}
                                h={16}
                                borderRadius="full"
                                bg="brand.500"
                                color="white"
                                position="relative"
                            >
                                <Icon as={step.icon} boxSize={7} aria-hidden="true" />
                                <Badge position="absolute" top={-1} right={-1} borderRadius="full" colorScheme="purple">
                                    {step.n}
                                </Badge>
                            </Flex>
                            <Heading as="h3" size="md">
                                {t(`home.step${step.n}`)}
                            </Heading>
                            <Text color="text.muted">{t(`home.step${step.n}Desc`)}</Text>
                        </VStack>
                    ))}
                </SimpleGrid>
                <Flex justify="center" mt={10}>
                    <Button as={NextLink} href="/create" size="lg" rightIcon={<ArrowRight size={18} />}>
                        {t('home.stepsCta')}
                    </Button>
                </Flex>
                <Text textAlign="center" color="text.muted" mt={8} maxW="2xl" mx="auto">
                    {t('home.steps1on1Note')}{' '}
                    <Link as={NextLink} href="/booking/new" color="brand.fg" fontWeight="semibold" textDecoration="underline">
                        {t('home.steps1on1Link')}
                    </Link>
                </Text>
            </Container>
        </Box>
    );
}

function UseCaseSection() {
    const { t } = useI18n();
    return (
        <Box as="section" id="use-cases" py={{ base: 16, md: 20 }} aria-labelledby="use-cases-heading">
            <Container maxW="container.xl">
                <SectionHeading id="use-cases-heading" title={t('home.useCasesTitle')} lead={t('home.useCasesLead')} />
                <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={6}>
                    {useCases.map((useCase) => (
                        <Box
                            as="article"
                            key={useCase.n}
                            p={6}
                            bg="bg.card"
                            borderRadius="xl"
                            border="1px solid"
                            borderColor="border.default"
                        >
                            <HStack mb={3} align="flex-start">
                                <Icon as={useCase.icon} boxSize={6} color="brand.fg" aria-hidden="true" />
                                <Heading as="h3" size="md">
                                    {t(`home.useCase${useCase.n}Title`)}
                                </Heading>
                            </HStack>
                            <Text color="text.muted" mb={4}>
                                {t(`home.useCase${useCase.n}Desc`)}
                            </Text>
                            <List spacing={2}>
                                {itemNumbers.map((i) => (
                                    <ListItem key={i} fontSize="sm" display="flex" alignItems="flex-start">
                                        <ListIcon as={CheckCircle2} color="green.500" mt={0.5} aria-hidden="true" />
                                        {t(`home.useCase${useCase.n}Item${i}`)}
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    ))}
                </SimpleGrid>
            </Container>
        </Box>
    );
}

function FaqExcerpt() {
    const { t } = useI18n();
    const items = getFaqItems(t, landingFaqKeys);
    return (
        <Box as="section" id="faq" py={{ base: 16, md: 20 }} bg="bg.card" aria-labelledby="faq-heading">
            <Container maxW="container.md">
                <SectionHeading id="faq-heading" title={t('home.faqTitle')} />
                <Accordion allowMultiple>
                    {items.map((item) => (
                        <AccordionItem key={item.key}>
                            <h3>
                                <AccordionButton py={4}>
                                    <Box as="span" flex="1" textAlign="left" fontWeight="semibold">
                                        {item.question}
                                    </Box>
                                    <AccordionIcon />
                                </AccordionButton>
                            </h3>
                            <AccordionPanel pb={4} color="text.muted">
                                {item.answer}
                            </AccordionPanel>
                        </AccordionItem>
                    ))}
                </Accordion>
                <Flex justify="center" mt={8}>
                    <Button as={NextLink} href="/faq" variant="link" rightIcon={<ArrowRight size={16} />}>
                        {t('home.faqMore')}
                    </Button>
                </Flex>
            </Container>
        </Box>
    );
}

function FinalCta() {
    const { t } = useI18n();
    return (
        <Box as="section" py={{ base: 16, md: 20 }} aria-labelledby="cta-heading">
            <Container maxW="container.md">
                <VStack
                    spacing={6}
                    p={{ base: 8, md: 12 }}
                    borderRadius="2xl"
                    bgGradient="linear(to-r, brand.600, purple.600)"
                    textAlign="center"
                    color="white"
                >
                    <Icon as={Link2} boxSize={10} aria-hidden="true" />
                    <Heading as="h2" id="cta-heading" size="lg">
                        {t('home.ctaTitle')}
                    </Heading>
                    <Text fontSize="lg">{t('home.ctaDesc')}</Text>
                    <Stack direction={{ base: 'column', sm: 'row' }} spacing={4} w={{ base: 'full', sm: 'auto' }}>
                        <Button
                            as={NextLink}
                            href="/create"
                            size="lg"
                            bg="white"
                            color="brand.700"
                            _hover={{ bg: 'gray.100' }}
                            rightIcon={<ArrowRight size={18} />}
                        >
                            {t('home.createEvent')}
                        </Button>
                        <Button
                            as={NextLink}
                            href="/booking/new"
                            size="lg"
                            variant="outline"
                            color="white"
                            borderColor="whiteAlpha.800"
                            _hover={{ bg: 'whiteAlpha.200' }}
                        >
                            {t('home.ctaBooking')}
                        </Button>
                    </Stack>
                </VStack>
            </Container>
        </Box>
    );
}

/**
 * Landing page: MVP's SEO structure (single h1, #features / #how-it-works, use cases,
 * FAQ excerpt, CTA) merged with origin/main's mode selector (group vs 1-on-1).
 */
export function LandingPage() {
    return (
        <PageShell>
            <HeroSection />
            <ModeSelector />
            <FeatureSection />
            <HowItWorksSection />
            <UseCaseSection />
            <FaqExcerpt />
            <FinalCta />
        </PageShell>
    );
}
