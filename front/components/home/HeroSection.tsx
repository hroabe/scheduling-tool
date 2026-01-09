'use client';

import {
    Box,
    Container,
    Grid,
    VStack,
    Stack,
    Heading,
    Text,
    Button,
    Tag,
    Wrap,
    WrapItem,
    AspectRatio,
    useColorModeValue,
} from '@chakra-ui/react';
import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/providers/I18nProvider';
import { getAvailabilitySymbols } from '@/lib/availabilitySymbols';

interface DeviceMockProps {
    imageSrc: string;
    imageAlt: string;
    id?: string;
}

function DeviceMock({ imageSrc, imageAlt, id }: DeviceMockProps) {
    const frameBg = useColorModeValue('gray.100', 'gray.700');
    const borderColor = useColorModeValue('gray.300', 'gray.600');

    return (
        <Box
            id={id}
            borderRadius="xl"
            overflow="hidden"
            boxShadow="lg"
            border="1px solid"
            borderColor={borderColor}
            bg={frameBg}
            maxW={{ base: '100%', md: '420px' }}
            mx="auto"
        >
            {/* Top bar (laptop-style) */}
            <Box
                bg={frameBg}
                px={3}
                py={1.5}
                borderBottom="1px solid"
                borderColor={borderColor}
                display="flex"
                gap={1.5}
            >
                <Box w={2} h={2} borderRadius="full" bg="red.400" />
                <Box w={2} h={2} borderRadius="full" bg="yellow.400" />
                <Box w={2} h={2} borderRadius="full" bg="green.400" />
            </Box>
            
            {/* Screenshot */}
            <AspectRatio ratio={16 / 10}>
                <Image
                    src={imageSrc}
                    alt={imageAlt}
                    fill
                    style={{ objectFit: 'cover' }}
                    priority
                />
            </AspectRatio>
        </Box>
    );
}

export function HeroSection() {
    const { t, locale } = useI18n();
    const symbols = getAvailabilitySymbols(locale);

    const handleDemoScroll = () => {
        const el = document.getElementById('hero-device-mock');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    // Badges - use symbols.label for the voting badge
    const badges = [
        t('home.badgeNoReg'),
        t('home.badgeUrlShare'),
        symbols.label, // Dynamic: ○△× or ✓ ? x
        t('home.badge1on1'),
    ];

    // H1 with intentional line break for Japanese
    const heroTitle = locale === 'ja' 
        ? '日程調整を、\nもっとシンプルに。'
        : t('home.heroTitle');

    return (
        <Box
            bgGradient="linear(to-br, blue.400, blue.500, blue.600)"
            py={{ base: 6, md: 8 }}
            color="white"
        >
            <Container maxW="6xl">
                <Grid
                    templateColumns={{ base: '1fr', md: '1fr 1fr' }}
                    gap={{ base: 6, md: 8 }}
                    alignItems="center"
                >
                    {/* Left: Copy & CTA */}
                    <VStack align="start" spacing={4}>
                        {/* H1 with whiteSpace pre-line to preserve intentional line breaks */}
                        <Heading
                            as="h1"
                            fontSize={{ base: '3xl', md: '4xl', lg: '5xl' }}
                            fontWeight="bold"
                            lineHeight="1.2"
                            whiteSpace="pre-line"
                            maxW={{ base: '100%', md: '500px' }}
                        >
                            {heroTitle}
                        </Heading>
                        
                        <Text
                            fontSize={{ base: 'md', md: 'lg' }}
                            opacity={0.95}
                            lineHeight="1.6"
                        >
                            {t('home.heroSubtitle')}
                        </Text>

                        {/* Badges */}
                        <Wrap spacing={2}>
                            {badges.map((badge, i) => (
                                <WrapItem key={i}>
                                    <Tag
                                        size="md"
                                        bg="whiteAlpha.200"
                                        color="white"
                                        fontWeight="medium"
                                        borderRadius="full"
                                        fontSize="sm"
                                    >
                                        {badge}
                                    </Tag>
                                </WrapItem>
                            ))}
                        </Wrap>

                        {/* CTAs - Stack changes direction for mobile/desktop */}
                        <Stack
                            direction={{ base: 'column', sm: 'row' }}
                            spacing={3}
                            pt={1}
                            w={{ base: 'full', sm: 'auto' }}
                        >
                            {/* Primary CTA - Full width on mobile */}
                            <Button
                                as={Link}
                                href="/create"
                                size="lg"
                                w={{ base: 'full', sm: 'auto' }}
                                bg="white"
                                color="blue.600"
                                fontWeight="semibold"
                                fontSize="md"
                                _hover={{
                                    bg: 'gray.100',
                                    transform: 'translateY(-1px)',
                                }}
                                transition="all 0.2s"
                            >
                                {t('home.primaryCta')}
                            </Button>
                            {/* Secondary CTA - ghost variant, weaker hierarchy */}
                            <Button
                                size="lg"
                                w={{ base: 'full', sm: 'auto' }}
                                variant="ghost"
                                color="white"
                                fontSize="md"
                                _hover={{
                                    bg: 'whiteAlpha.200',
                                }}
                                onClick={handleDemoScroll}
                            >
                                {t('home.secondaryCta')}
                            </Button>
                        </Stack>

                        {/* Microcopy */}
                        <Text fontSize="sm" opacity={0.8}>
                            {t('home.microcopy')}
                        </Text>
                    </VStack>

                    {/* Right: Device Mock - Desktop only */}
                    <Box display={{ base: 'none', md: 'block' }}>
                        <DeviceMock
                            id="hero-device-mock-desktop"
                            imageSrc="/images/hero-screenshot.png"
                            imageAlt={t('home.screenshotAlt')}
                        />
                    </Box>
                </Grid>

                {/* Mobile DeviceMock - shown below CTA on mobile */}
                <Box display={{ base: 'block', md: 'none' }} mt={6}>
                    <DeviceMock
                        id="hero-device-mock"
                        imageSrc="/images/hero-screenshot.png"
                        imageAlt={t('home.screenshotAlt')}
                    />
                </Box>
            </Container>
        </Box>
    );
}
