'use client';

/**
 * Mode Selector Section
 * 
 * Two cards: Group voting / 1on1 booking
 * Based on the design from toppage-new-improvement.md
 */

import {
    Box,
    Container,
    Grid,
    VStack,
    HStack,
    Heading,
    Text,
    Button,
    Card,
    CardBody,
    Icon,
    useColorModeValue,
    Badge,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
    Avatar,
} from '@chakra-ui/react';
import Link from 'next/link';
import { Calendar, Users, Clock, ArrowRight } from 'lucide-react';
import { useI18n } from '@/providers/I18nProvider';
import { getAvailabilitySymbols } from '@/lib/availabilitySymbols';

export function ModeSelector() {
    const { t, locale } = useI18n();
    const symbols = getAvailabilitySymbols(locale);
    
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const mutedText = useColorModeValue('gray.600', 'gray.400');
    
    // Mock data for demos
    const groupDemoData = [
        { name: '候補日', label: '確認中' },
        { name: 'あなた', dept: '主催者調整用', votes: [symbols.yes, symbols.yes, symbols.no] },
        { name: '山田 大郎', votes: [symbols.yes, symbols.maybe, symbols.yes] },
    ];
    
    const oneOnOneDemoData = [
        { name: '山田 大郎', votes: [symbols.yes, symbols.maybe, symbols.no] },
        { name: '田中 花子', times: ['○ 4', '× ○'] },
    ];

    return (
        <Box py={{ base: 12, md: 16 }} bg={useColorModeValue('gray.50', 'gray.900')}>
            <Container maxW="6xl">
                <VStack spacing={8}>
                    <Heading as="h2" size="lg" textAlign="center">
                        {t('home.modeSelectorTitle') || '用途に合わせて選べます'}
                    </Heading>

                    <Grid
                        templateColumns={{ base: '1fr', lg: '1fr 1fr' }}
                        gap={6}
                        w="full"
                    >
                        {/* Card 1: Group Voting */}
                        <Card
                            bg={cardBg}
                            border="1px solid"
                            borderColor={borderColor}
                            borderRadius="xl"
                            overflow="hidden"
                            _hover={{ boxShadow: 'lg', borderColor: 'blue.300' }}
                            transition="all 0.2s"
                        >
                            <CardBody p={6}>
                                <VStack align="stretch" spacing={4}>
                                    <HStack>
                                        <Icon as={Users} boxSize={6} color="blue.500" />
                                        <Heading size="md">
                                            {t('home.modeGroupTitle') || `みんなで調整（${symbols.label}投票）`}
                                        </Heading>
                                    </HStack>
                                    
                                    <Text color={mutedText} fontSize="sm">
                                        {t('home.modeGroupDesc') || '複数人の都合を集めて、最適な日程を見つけます。'}
                                    </Text>

                                    {/* Mini Demo Table */}
                                    <Box
                                        border="1px solid"
                                        borderColor={borderColor}
                                        borderRadius="lg"
                                        overflow="hidden"
                                        fontSize="sm"
                                    >
                                        <Table size="sm" variant="simple">
                                            <Thead bg={useColorModeValue('gray.50', 'gray.700')}>
                                                <Tr>
                                                    <Th fontSize="xs" py={2}>名前</Th>
                                                    <Th fontSize="xs" py={2} textAlign="center">{symbols.yes}</Th>
                                                    <Th fontSize="xs" py={2} textAlign="center">{symbols.maybe}</Th>
                                                    <Th fontSize="xs" py={2} textAlign="center">{symbols.no}</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                <Tr>
                                                    <Td py={2}>
                                                        <HStack spacing={2}>
                                                            <Avatar size="xs" name="あなた" bg="blue.400" />
                                                            <VStack align="start" spacing={0}>
                                                                <Text fontWeight="medium">あなた</Text>
                                                                <Text fontSize="xs" color="gray.500">主催者調整用</Text>
                                                            </VStack>
                                                        </HStack>
                                                    </Td>
                                                    <Td textAlign="center" color="green.500">{symbols.yes}</Td>
                                                    <Td textAlign="center" color="green.500">{symbols.yes}</Td>
                                                    <Td textAlign="center" color="red.500">{symbols.no}</Td>
                                                </Tr>
                                                <Tr>
                                                    <Td py={2}>
                                                        <HStack spacing={2}>
                                                            <Avatar size="xs" name="山田" bg="gray.400" />
                                                            <Text fontWeight="medium">山田 大郎</Text>
                                                        </HStack>
                                                    </Td>
                                                    <Td textAlign="center" color="green.500">{symbols.yes}</Td>
                                                    <Td textAlign="center" color="yellow.500">{symbols.maybe}</Td>
                                                    <Td textAlign="center" color="green.500">{symbols.yes}</Td>
                                                </Tr>
                                            </Tbody>
                                        </Table>
                                    </Box>

                                    <Button
                                        as={Link}
                                        href="/create?mode=group"
                                        colorScheme="blue"
                                        size="lg"
                                        w="full"
                                        rightIcon={<ArrowRight size={18} />}
                                    >
                                        {t('home.modeGroupCta') || 'みんなの予定が揃いました'}
                                    </Button>
                                    
                                    <Text fontSize="xs" color="gray.500" textAlign="center">
                                        {t('home.modeGroupNote') || 'あとから回り順えあでできます'}
                                    </Text>
                                </VStack>
                            </CardBody>
                        </Card>

                        {/* Card 2: 1on1 Booking */}
                        <Card
                            bg={cardBg}
                            border="1px solid"
                            borderColor={borderColor}
                            borderRadius="xl"
                            overflow="hidden"
                            _hover={{ boxShadow: 'lg', borderColor: 'blue.300' }}
                            transition="all 0.2s"
                        >
                            <CardBody p={6}>
                                <VStack align="stretch" spacing={4}>
                                    <HStack>
                                        <Icon as={Calendar} boxSize={6} color="blue.500" />
                                        <Heading size="md">
                                            {t('home.mode1on1Title') || '1on1予約'}
                                            <Text as="span" fontSize="sm" fontWeight="normal" color={mutedText} ml={1}>
                                                （空き枠→確定）
                                            </Text>
                                        </Heading>
                                    </HStack>
                                    
                                    <Text color={mutedText} fontSize="sm">
                                        {t('home.mode1on1Desc') || '主催者の空き枠を公開して、ゲストが選んで予約確定します。'}
                                    </Text>

                                    {/* Mini Demo Table */}
                                    <Box
                                        border="1px solid"
                                        borderColor={borderColor}
                                        borderRadius="lg"
                                        overflow="hidden"
                                        fontSize="sm"
                                    >
                                        <Table size="sm" variant="simple">
                                            <Thead bg={useColorModeValue('gray.50', 'gray.700')}>
                                                <Tr>
                                                    <Th fontSize="xs" py={2}>招待者</Th>
                                                    <Th fontSize="xs" py={2}>最短</Th>
                                                    <Th fontSize="xs" py={2} textAlign="center">{symbols.yes}</Th>
                                                    <Th fontSize="xs" py={2} textAlign="center">{symbols.no}</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                <Tr>
                                                    <Td py={2}>
                                                        <HStack spacing={2}>
                                                            <Avatar size="xs" name="山田" bg="blue.400" />
                                                            <Text fontWeight="medium">山田 大郎</Text>
                                                        </HStack>
                                                    </Td>
                                                    <Td><Badge colorScheme="green">本日</Badge></Td>
                                                    <Td textAlign="center" color="green.500">{symbols.yes}</Td>
                                                    <Td textAlign="center" color="red.500">{symbols.no}</Td>
                                                </Tr>
                                                <Tr>
                                                    <Td py={2}>
                                                        <HStack spacing={2}>
                                                            <Avatar size="xs" name="田中" bg="pink.400" />
                                                            <Text fontWeight="medium">田中 花子</Text>
                                                        </HStack>
                                                    </Td>
                                                    <Td>
                                                        <Text fontSize="xs" color="gray.500">○ 4</Text>
                                                    </Td>
                                                    <Td textAlign="center" color="green.500">{symbols.yes}</Td>
                                                    <Td textAlign="center" color="green.500">{symbols.yes}</Td>
                                                </Tr>
                                            </Tbody>
                                        </Table>
                                    </Box>

                                    <Button
                                        as={Link}
                                        href="/booking/new"
                                        colorScheme="blue"
                                        size="lg"
                                        w="full"
                                        rightIcon={<ArrowRight size={18} />}
                                    >
                                        {t('home.mode1on1Cta') || 'このモードで作成'}
                                    </Button>
                                    
                                    <Text fontSize="xs" color="gray.500" textAlign="center">
                                        {t('home.mode1on1Note') || '最速15分、あとは日程を待つだけ。'}
                                    </Text>
                                </VStack>
                            </CardBody>
                        </Card>
                    </Grid>
                </VStack>
            </Container>
        </Box>
    );
}
