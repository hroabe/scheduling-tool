'use client';

import { Box } from '@chakra-ui/react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import {
    HeroSection,
    ModeSelector,
    StepsStrip,
    UseCaseCards,
    FeatureGrid,
    FaqAccordion,
    FinalCta,
} from '@/components/home';

export default function HomePage() {
    return (
        <Box minH="100vh">
            <Header />
            <HeroSection />
            <ModeSelector />
            <StepsStrip />
            <UseCaseCards />
            <FeatureGrid />
            <FaqAccordion />
            <FinalCta />
            <Footer />
        </Box>
    );
}
