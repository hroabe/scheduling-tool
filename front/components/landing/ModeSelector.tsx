'use client';

/**
 * Mode selector (merged from origin/main's home page): choose between group scheduling
 * (candidate dates + availability poll) and a 1-on-1 booking page (publish open slots).
 */

import {
    Box,
    Button,
    Container,
    Flex,
    Heading,
    Icon,
    List,
    ListIcon,
    ListItem,
    SimpleGrid,
    Text,
    VStack,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { ArrowRight, CalendarClock, CheckCircle2, Users, type LucideIcon } from 'lucide-react';
import { useAvailabilitySymbols } from '@/lib/availabilitySymbols';
import { useI18n } from '@/providers/I18nProvider';
import { SectionHeading } from './SectionHeading';

interface Mode {
    id: string;
    icon: LucideIcon;
    /** Message key prefix in the `home` namespace */
    prefix: 'modeGroup' | 'mode1on1';
    href: string;
    variant: 'solid' | 'outline';
}

const modes: Mode[] = [
    { id: 'mode-group', icon: Users, prefix: 'modeGroup', href: '/create', variant: 'solid' },
    { id: 'mode-1on1', icon: CalendarClock, prefix: 'mode1on1', href: '/booking/new', variant: 'outline' },
];

const pointNumbers = [1, 2, 3];

export function ModeSelector() {
    const { t } = useI18n();
    const symbols = useAvailabilitySymbols();

    return (
        <Box as="section" id="modes" py={{ base: 16, md: 20 }} bg="bg.subtle" aria-labelledby="modes-heading">
            <Container maxW="container.lg">
                <SectionHeading id="modes-heading" title={t('home.modeSelectorTitle')} lead={t('home.modeSelectorLead')} />
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                    {modes.map((mode) => (
                        <VStack
                            as="article"
                            key={mode.id}
                            aria-labelledby={`${mode.id}-title`}
                            align="stretch"
                            spacing={4}
                            p={{ base: 6, md: 8 }}
                            bg="bg.card"
                            borderRadius="xl"
                            border="1px solid"
                            borderColor="border.default"
                            _hover={{ boxShadow: 'lg' }}
                            transition="box-shadow 0.2s"
                        >
                            <Flex align="center" gap={3}>
                                <Flex
                                    align="center"
                                    justify="center"
                                    w={12}
                                    h={12}
                                    flexShrink={0}
                                    borderRadius="lg"
                                    bg="brand.subtle"
                                    color="brand.fg"
                                >
                                    <Icon as={mode.icon} boxSize={6} aria-hidden="true" />
                                </Flex>
                                <Heading as="h3" id={`${mode.id}-title`} size="md">
                                    {t(`home.${mode.prefix}Title`)}
                                </Heading>
                            </Flex>
                            <Text color="text.muted">{t(`home.${mode.prefix}Desc`, { symbols: symbols.label })}</Text>
                            <List spacing={2} flex={1}>
                                {pointNumbers.map((n) => (
                                    <ListItem key={n} fontSize="sm" display="flex" alignItems="flex-start">
                                        <ListIcon as={CheckCircle2} color="green.500" mt={0.5} aria-hidden="true" />
                                        {t(`home.${mode.prefix}Point${n}`)}
                                    </ListItem>
                                ))}
                            </List>
                            <Button
                                as={NextLink}
                                href={mode.href}
                                size="lg"
                                w="full"
                                variant={mode.variant}
                                rightIcon={<ArrowRight size={18} />}
                                whiteSpace="normal"
                            >
                                {t(`home.${mode.prefix}Cta`)}
                            </Button>
                            <Text fontSize="sm" color="text.muted" textAlign="center">
                                {t(`home.${mode.prefix}Note`)}
                            </Text>
                        </VStack>
                    ))}
                </SimpleGrid>
            </Container>
        </Box>
    );
}
