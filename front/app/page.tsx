'use client';

import {
    Box,
    Container,
    Heading,
    Text,
    Button,
    VStack,
    HStack,
    SimpleGrid,
    Icon,
    Flex,
    useColorModeValue,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Calendar, Users, Share2, Clock, CheckCircle, Shield } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const MotionBox = motion(Box);
const MotionVStack = motion(VStack);

const features = [
    {
        icon: Calendar,
        title: '簡単な日程登録',
        description: '複数の候補日をカレンダーから直感的に選択できます。',
    },
    {
        icon: Share2,
        title: 'URL共有',
        description: 'URLを共有するだけで、誰でも回答できます。登録不要です。',
    },
    {
        icon: Users,
        title: 'リアルタイム集計',
        description: '回答状況をリアルタイムで確認。最適な日程を自動提案。',
    },
    {
        icon: Clock,
        title: '期限設定',
        description: '回答期限を設定して、リマインダーを自動送信。',
    },
    {
        icon: CheckCircle,
        title: '◯△×の回答',
        description: '参加可能・調整可能・不可の3段階で回答できます。',
    },
    {
        icon: Shield,
        title: '安全・安心',
        description: '編集キーで不正な変更を防止。SSL暗号化通信。',
    },
];

export default function HomePage() {
    const bgGradient = useColorModeValue(
        'linear(to-br, brand.50, white, purple.50)',
        'linear(to-br, gray.900, gray.800, purple.900)'
    );
    const cardBg = useColorModeValue('white', 'gray.800');
    const cardBorder = useColorModeValue('gray.100', 'gray.700');

    return (
        <Box minH="100vh" bgGradient={bgGradient}>
            <Header />

            {/* Hero Section */}
            <Container maxW="container.xl" pt={{ base: 8, md: 16 }} pb={20}>
                <MotionVStack
                    spacing={8}
                    textAlign="center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <VStack spacing={4}>
                        <Heading
                            as="h1"
                            size={{ base: '2xl', md: '3xl', lg: '4xl' }}
                            fontWeight="bold"
                            bgGradient="linear(to-r, brand.500, purple.500)"
                            bgClip="text"
                        >
                            日程調整を、もっとシンプルに
                        </Heading>
                        <Text
                            fontSize={{ base: 'lg', md: 'xl' }}
                            color="gray.600"
                            maxW="2xl"
                        >
                            会議やイベントの日程調整を簡単に。
                            <br />
                            参加者全員の都合を確認し、最適な日程を見つけましょう。
                        </Text>
                    </VStack>

                    <HStack spacing={4} flexWrap="wrap" justify="center">
                        <Button
                            as={Link}
                            href="/create"
                            size="lg"
                            colorScheme="brand"
                            px={8}
                            _hover={{
                                transform: 'translateY(-2px)',
                                boxShadow: 'lg',
                            }}
                            transition="all 0.2s"
                        >
                            イベントを作成する
                        </Button>
                        <Button
                            as={Link}
                            href="#features"
                            size="lg"
                            variant="outline"
                            px={8}
                        >
                            機能を見る
                        </Button>
                    </HStack>
                </MotionVStack>

                {/* Demo/Screenshot Section */}
                <MotionBox
                    mt={16}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <Box
                        bg={cardBg}
                        borderRadius="2xl"
                        boxShadow="2xl"
                        border="1px solid"
                        borderColor={cardBorder}
                        overflow="hidden"
                        p={8}
                    >
                        <Flex
                            align="center"
                            justify="center"
                            minH="300px"
                            bg={useColorModeValue('gray.50', 'gray.700')}
                            borderRadius="xl"
                        >
                            <VStack spacing={4}>
                                <Icon as={Calendar} boxSize={16} color="brand.500" />
                                <Text color="gray.500" fontSize="lg">
                                    直感的なカレンダーUI
                                </Text>
                            </VStack>
                        </Flex>
                    </Box>
                </MotionBox>
            </Container>

            {/* Features Section */}
            <Box id="features" py={20} bg={useColorModeValue('white', 'gray.800')}>
                <Container maxW="container.xl">
                    <VStack spacing={12}>
                        <VStack spacing={4} textAlign="center">
                            <Heading size="xl">機能紹介</Heading>
                            <Text fontSize="lg" color="gray.600" maxW="2xl">
                                シンプルながら、必要な機能は全て揃っています。
                            </Text>
                        </VStack>

                        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8} w="full">
                            {features.map((feature, index) => (
                                <MotionBox
                                    key={feature.title}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.3, delay: index * 0.1 }}
                                >
                                    <Box
                                        p={6}
                                        bg={cardBg}
                                        borderRadius="xl"
                                        border="1px solid"
                                        borderColor={cardBorder}
                                        _hover={{
                                            transform: 'translateY(-4px)',
                                            boxShadow: 'lg',
                                        }}
                                        transition="all 0.2s"
                                        h="full"
                                    >
                                        <VStack align="start" spacing={4}>
                                            <Flex
                                                align="center"
                                                justify="center"
                                                w={12}
                                                h={12}
                                                borderRadius="lg"
                                                bg="brand.50"
                                                color="brand.500"
                                            >
                                                <Icon as={feature.icon} boxSize={6} />
                                            </Flex>
                                            <Heading size="md">{feature.title}</Heading>
                                            <Text color="gray.600">{feature.description}</Text>
                                        </VStack>
                                    </Box>
                                </MotionBox>
                            ))}
                        </SimpleGrid>
                    </VStack>
                </Container>
            </Box>

            {/* CTA Section */}
            <Box py={20}>
                <Container maxW="container.md">
                    <Box
                        p={12}
                        borderRadius="2xl"
                        bgGradient="linear(to-r, brand.500, purple.500)"
                        textAlign="center"
                        color="white"
                    >
                        <VStack spacing={6}>
                            <Heading size="lg">
                                今すぐ始めましょう
                            </Heading>
                            <Text fontSize="lg" opacity={0.9}>
                                登録不要。無料でお使いいただけます。
                            </Text>
                            <Button
                                as={Link}
                                href="/create"
                                size="lg"
                                colorScheme="whiteAlpha"
                                bg="white"
                                color="brand.500"
                                _hover={{
                                    bg: 'gray.100',
                                    transform: 'translateY(-2px)',
                                }}
                            >
                                イベントを作成する
                            </Button>
                        </VStack>
                    </Box>
                </Container>
            </Box>

            <Footer />
        </Box>
    );
}
