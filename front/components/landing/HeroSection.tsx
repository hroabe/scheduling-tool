'use client';

import {
    Badge,
    Box,
    Button,
    Container,
    Flex,
    Heading,
    HStack,
    Icon,
    Stack,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAvailabilitySymbols, type AvailabilitySymbols } from '@/lib/availabilitySymbols';
import { useI18n } from '@/providers/I18nProvider';

type Mark = 'yes' | 'maybe' | 'no';

const markColor: Record<Mark, string> = { yes: 'green', maybe: 'yellow', no: 'red' };

const demoRows: { nameKey: string; marks: Mark[] }[] = [
    { nameKey: 'home.demoName1', marks: ['yes', 'maybe', 'no'] },
    { nameKey: 'home.demoName2', marks: ['yes', 'yes', 'maybe'] },
    { nameKey: 'home.demoName3', marks: ['maybe', 'no', 'yes'] },
];

const heroChecks = ['home.heroCheckNoAccount', 'home.heroCheckMobile', 'home.heroCheckOneMinute'];

/** Static preview of an event's response table (exposed to assistive tech as a single image) */
function DemoTable({ symbols }: { symbols: AvailabilitySymbols }) {
    const { t } = useI18n();
    return (
        <Box
            bg="bg.card"
            borderRadius="2xl"
            boxShadow="xl"
            border="1px solid"
            borderColor="border.default"
            p={{ base: 4, md: 6 }}
            w="full"
            maxW="lg"
            aria-label={t('home.demoAlt')}
            role="img"
        >
            <HStack justify="space-between" mb={4}>
                <Text fontWeight="bold">{t('home.demoTitle')}</Text>
                <Badge colorScheme="blue">{t('home.demoStatus')}</Badge>
            </HStack>
            <Box overflowX="auto">
                <Table size="sm" variant="simple">
                    <Thead>
                        <Tr>
                            <Th>{t('home.demoParticipant')}</Th>
                            <Th textAlign="center">
                                {t('home.demoDate1')}
                                <Badge ml={1} colorScheme="green" fontSize="2xs">
                                    {t('home.demoRecommended')}
                                </Badge>
                            </Th>
                            <Th textAlign="center">{t('home.demoDate2')}</Th>
                            <Th textAlign="center">{t('home.demoDate3')}</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {demoRows.map((row) => (
                            <Tr key={row.nameKey}>
                                <Td fontWeight="medium">{t(row.nameKey)}</Td>
                                {row.marks.map((mark, i) => (
                                    <Td key={i} textAlign="center">
                                        <Badge colorScheme={markColor[mark]} fontSize="md" px={2}>
                                            {symbols[mark]}
                                        </Badge>
                                    </Td>
                                ))}
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </Box>
            <HStack mt={4} spacing={2} justify="flex-end">
                <Badge variant="outline" colorScheme="brand">
                    CSV
                </Badge>
                <Badge variant="outline" colorScheme="brand">
                    ICS
                </Badge>
                <Badge variant="outline" colorScheme="brand">
                    {t('home.demoEdit')}
                </Badge>
            </HStack>
        </Box>
    );
}

/** Hero with the page's only h1. No entrance animation: the heading is the LCP element. */
export function HeroSection() {
    const { t } = useI18n();
    const symbols = useAvailabilitySymbols();

    return (
        <Box
            bgGradient="linear(to-br, brand.50, white, purple.50)"
            _dark={{ bgGradient: 'linear(to-br, gray.900, gray.800, #2a1f4d)' }}
        >
            <Container maxW="container.xl" py={{ base: 12, md: 20 }}>
                <Stack direction={{ base: 'column', lg: 'row' }} spacing={12} align="center">
                    <VStack
                        align={{ base: 'center', lg: 'start' }}
                        textAlign={{ base: 'center', lg: 'left' }}
                        spacing={6}
                        flex={1}
                    >
                        <Badge colorScheme="brand" px={3} py={1} borderRadius="full" fontSize="sm">
                            {t('home.heroBadge')}
                        </Badge>
                        <Heading as="h1" size={{ base: '2xl', md: '3xl' }} lineHeight="1.25">
                            {t('home.heroTitleLine1')}
                            <br />
                            <Box as="span" color="brand.fg">
                                {t('home.heroTitleLine2')}
                            </Box>
                        </Heading>
                        <Text fontSize={{ base: 'md', md: 'xl' }} color="text.muted" maxW="xl">
                            {t('home.heroSubtitle', { symbols: symbols.label })}
                        </Text>
                        <Stack direction={{ base: 'column', sm: 'row' }} spacing={4} w={{ base: 'full', sm: 'auto' }}>
                            <Button
                                as={NextLink}
                                href="/create"
                                size="lg"
                                px={8}
                                rightIcon={<ArrowRight size={18} />}
                                _hover={{ transform: 'scale(1.02)' }}
                                transition="transform 0.15s"
                            >
                                {t('home.primaryCta')}
                            </Button>
                            <Button as={NextLink} href="#how-it-works" size="lg" variant="outline" px={8}>
                                {t('home.secondaryCta')}
                            </Button>
                        </Stack>
                        <HStack
                            as="ul"
                            listStyleType="none"
                            spacing={4}
                            color="text.muted"
                            fontSize="sm"
                            flexWrap="wrap"
                            justify={{ base: 'center', lg: 'start' }}
                        >
                            {heroChecks.map((key) => (
                                <HStack as="li" key={key} spacing={1}>
                                    <Icon as={CheckCircle2} color="green.500" aria-hidden="true" />
                                    <Text as="span">{t(key)}</Text>
                                </HStack>
                            ))}
                        </HStack>
                    </VStack>
                    <Flex flex={1} justify="center" w="full">
                        <DemoTable symbols={symbols} />
                    </Flex>
                </Stack>
            </Container>
        </Box>
    );
}
