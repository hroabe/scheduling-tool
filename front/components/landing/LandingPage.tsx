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
    List,
    ListIcon,
    ListItem,
    SimpleGrid,
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
import { motion } from 'framer-motion';
import NextLink from 'next/link';
import {
    ArrowRight,
    CalendarCheck,
    CalendarPlus,
    CheckCircle2,
    FileSpreadsheet,
    Link2,
    PencilLine,
    Presentation,
    Share2,
    Smartphone,
    Sparkles,
    UserX,
    Users,
    Briefcase,
    type LucideIcon,
} from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { faqItems } from '@/lib/faq';

const MotionBox = motion.create(Box);

const features: { icon: LucideIcon; title: string; description: string }[] = [
    {
        icon: UserX,
        title: '登録不要・無料',
        description: '主催者も回答者もアカウント登録なし。URLを共有するだけで、誰でもすぐに回答できます。',
    },
    {
        icon: FileSpreadsheet,
        title: 'CSVでExcel管理',
        description: '◯△×とコメント、候補日ごとの集計をCSVでダウンロード。Excelでそのまま開けます。',
    },
    {
        icon: CalendarPlus,
        title: 'ICSでカレンダー連携',
        description: '決まった日程をGoogleカレンダー・Outlook・Appleカレンダーにワンクリックで追加。',
    },
    {
        icon: PencilLine,
        title: '作成後も編集できる',
        description: '候補日の追加・削除、イベント名や回答期限の変更、日程の確定まで後から自由に。',
    },
    {
        icon: Sparkles,
        title: 'おすすめ日程を自動表示',
        description: '◯は2点・△は1点で自動集計し、いちばん参加しやすい日程に「おすすめ」バッジを表示。',
    },
    {
        icon: Smartphone,
        title: 'スマホで快適・PWA対応',
        description: 'スマホに最適化されたモダンなUI。ホーム画面に追加すればアプリのように使えます。',
    },
];

const steps = [
    {
        icon: CalendarCheck,
        title: '候補日を選んで作成',
        description: 'イベント名・お名前を入力し、カレンダーから候補日をタップするだけ。',
    },
    {
        icon: Share2,
        title: 'URLを共有',
        description: 'LINE・メール・Slackなど、いつものツールで参加者にURLを送ります。',
    },
    {
        icon: CheckCircle2,
        title: '集計を確認して確定',
        description: '回答は自動で集計。おすすめ日程を確認して確定し、カレンダーに追加。',
    },
];

const useCases: { icon: LucideIcon; title: string; description: string; items: string[] }[] = [
    {
        icon: Presentation,
        title: '勉強会・イベント主催者',
        description: '不特定多数の参加者の出欠をまとめて管理。',
        items: ['勉強会・もくもく会・LT会', 'CSVで出欠リストを作成', '後から候補日を追加'],
    },
    {
        icon: Briefcase,
        title: '副業・フリーランス',
        description: '社外のクライアントとのミーティング調整に。',
        items: ['相手に登録をお願いしなくていい', '確定日程をICSでカレンダーへ', 'スマホからすぐ確認'],
    },
    {
        icon: Users,
        title: '小規模チーム・飲み会',
        description: '社外メンバーを含むチームの定例や懇親会に。',
        items: ['定例ミーティング・打ち合わせ', '歓送迎会・飲み会の日程調整', '集計を見てワンクリック確定'],
    },
];

const demoRows = [
    { name: '佐藤', marks: ['◯', '△', '×'] },
    { name: '鈴木', marks: ['◯', '◯', '△'] },
    { name: '田中', marks: ['△', '×', '◯'] },
];

function SectionHeading({ title, lead }: { title: string; lead?: string }) {
    return (
        <VStack spacing={3} textAlign="center" mb={10}>
            <Heading as="h2" size="xl">
                {title}
            </Heading>
            {lead && (
                <Text fontSize="lg" color="text.muted" maxW="2xl">
                    {lead}
                </Text>
            )}
        </VStack>
    );
}

function DemoTable() {
    const markColor: Record<string, string> = { '◯': 'green', '△': 'yellow', '×': 'red' };
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
            aria-label="回答状況の表示イメージ"
            role="img"
        >
            <HStack justify="space-between" mb={4}>
                <Text fontWeight="bold">チーム定例ミーティング</Text>
                <Badge colorScheme="blue">回答受付中</Badge>
            </HStack>
            <Box overflowX="auto">
                <Table size="sm" variant="simple">
                    <Thead>
                        <Tr>
                            <Th>参加者</Th>
                            <Th textAlign="center">
                                4/1(水)
                                <Badge ml={1} colorScheme="green" fontSize="2xs">
                                    おすすめ
                                </Badge>
                            </Th>
                            <Th textAlign="center">4/2(木)</Th>
                            <Th textAlign="center">4/3(金)</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {demoRows.map((row) => (
                            <Tr key={row.name}>
                                <Td fontWeight="medium">{row.name}</Td>
                                {row.marks.map((mark, i) => (
                                    <Td key={i} textAlign="center">
                                        <Badge colorScheme={markColor[mark]} fontSize="md" px={2}>
                                            {mark}
                                        </Badge>
                                    </Td>
                                ))}
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </Box>
            <HStack mt={4} spacing={2} justify="flex-end">
                <Badge variant="outline" colorScheme="brand">CSV</Badge>
                <Badge variant="outline" colorScheme="brand">ICS</Badge>
                <Badge variant="outline" colorScheme="brand">編集</Badge>
            </HStack>
        </Box>
    );
}

export function LandingPage() {
    return (
        <PageShell>
            {/* Hero */}
            <Box
                bgGradient="linear(to-br, brand.50, white, purple.50)"
                _dark={{ bgGradient: 'linear(to-br, gray.900, gray.800, #2a1f4d)' }}
            >
                <Container maxW="container.xl" py={{ base: 12, md: 20 }}>
                    <Stack direction={{ base: 'column', lg: 'row' }} spacing={12} align="center">
                        <VStack align={{ base: 'center', lg: 'start' }} textAlign={{ base: 'center', lg: 'left' }} spacing={6} flex={1}>
                            <Badge colorScheme="brand" px={3} py={1} borderRadius="full" fontSize="sm">
                                登録不要 ・ 完全無料
                            </Badge>
                            <Heading as="h1" size={{ base: '2xl', md: '3xl' }} lineHeight="1.25">
                                登録不要で、日程調整を
                                <br />
                                <Box as="span" color="brand.fg">
                                    CSV・ICSで結果を持ち出せる
                                </Box>
                            </Heading>
                            <Text fontSize={{ base: 'md', md: 'xl' }} color="text.muted" maxW="xl">
                                候補日を選んでURLを共有するだけ。◯△×の出欠を自動集計し、
                                決まった日程はExcel（CSV）やGoogleカレンダー・Outlook（ICS）へ。
                                作成後の候補日の追加・編集もできる、無料の日程調整ツールです。
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
                                    イベントを作成する
                                </Button>
                                <Button as={NextLink} href="#how-it-works" size="lg" variant="outline" px={8}>
                                    使い方を見る
                                </Button>
                            </Stack>
                            <HStack spacing={4} color="text.muted" fontSize="sm" flexWrap="wrap" justify={{ base: 'center', lg: 'start' }}>
                                <HStack spacing={1}>
                                    <Icon as={CheckCircle2} color="green.500" />
                                    <Text>アカウント登録なし</Text>
                                </HStack>
                                <HStack spacing={1}>
                                    <Icon as={CheckCircle2} color="green.500" />
                                    <Text>スマホ対応</Text>
                                </HStack>
                                <HStack spacing={1}>
                                    <Icon as={CheckCircle2} color="green.500" />
                                    <Text>1分で作成</Text>
                                </HStack>
                            </HStack>
                        </VStack>
                        <Flex flex={1} justify="center" w="full">
                            <DemoTable />
                        </Flex>
                    </Stack>
                </Container>
            </Box>

            {/* Features */}
            <Box as="section" id="features" py={{ base: 16, md: 20 }} aria-labelledby="features-heading">
                <Container maxW="container.xl">
                    <VStack spacing={3} textAlign="center" mb={10}>
                        <Heading as="h2" id="features-heading" size="xl">
                            日程調整の「その後」まで便利に
                        </Heading>
                        <Text fontSize="lg" color="text.muted" maxW="2xl">
                            出欠を集めて終わりではなく、結果をExcelやカレンダーで活用するところまで。
                        </Text>
                    </VStack>
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                        {features.map((feature, index) => (
                            <MotionBox
                                key={feature.title}
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
                                    <Flex
                                        align="center"
                                        justify="center"
                                        w={12}
                                        h={12}
                                        mb={4}
                                        borderRadius="lg"
                                        bg="brand.subtle"
                                        color="brand.fg"
                                    >
                                        <Icon as={feature.icon} boxSize={6} />
                                    </Flex>
                                    <Heading as="h3" size="md" mb={2}>
                                        {feature.title}
                                    </Heading>
                                    <Text color="text.muted">{feature.description}</Text>
                                </Box>
                            </MotionBox>
                        ))}
                    </SimpleGrid>
                </Container>
            </Box>

            {/* How it works */}
            <Box as="section" id="how-it-works" py={{ base: 16, md: 20 }} bg="bg.card" aria-label="使い方">
                <Container maxW="container.lg">
                    <SectionHeading title="使い方はかんたん3ステップ" lead="はじめての方でも1分でイベントを作成できます。" />
                    <SimpleGrid as="ol" columns={{ base: 1, md: 3 }} spacing={8} listStyleType="none">
                        {steps.map((step, index) => (
                            <VStack as="li" key={step.title} spacing={3} textAlign="center">
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
                                    <Icon as={step.icon} boxSize={7} />
                                    <Badge position="absolute" top={-1} right={-1} borderRadius="full" colorScheme="purple">
                                        {index + 1}
                                    </Badge>
                                </Flex>
                                <Heading as="h3" size="md">
                                    {step.title}
                                </Heading>
                                <Text color="text.muted">{step.description}</Text>
                            </VStack>
                        ))}
                    </SimpleGrid>
                    <Flex justify="center" mt={10}>
                        <Button as={NextLink} href="/create" size="lg" rightIcon={<ArrowRight size={18} />}>
                            さっそく作成する
                        </Button>
                    </Flex>
                </Container>
            </Box>

            {/* Use cases */}
            <Box as="section" py={{ base: 16, md: 20 }} aria-label="利用シーン">
                <Container maxW="container.xl">
                    <SectionHeading title="こんな日程調整に" lead="LINEグループに入っていない相手とも、URLひとつで調整できます。" />
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                        {useCases.map((useCase) => (
                            <Box
                                as="article"
                                key={useCase.title}
                                p={6}
                                bg="bg.card"
                                borderRadius="xl"
                                border="1px solid"
                                borderColor="border.default"
                            >
                                <HStack mb={3}>
                                    <Icon as={useCase.icon} boxSize={6} color="brand.fg" />
                                    <Heading as="h3" size="md">
                                        {useCase.title}
                                    </Heading>
                                </HStack>
                                <Text color="text.muted" mb={4}>
                                    {useCase.description}
                                </Text>
                                <List spacing={2}>
                                    {useCase.items.map((item) => (
                                        <ListItem key={item} fontSize="sm">
                                            <ListIcon as={CheckCircle2} color="green.500" />
                                            {item}
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>
                        ))}
                    </SimpleGrid>
                </Container>
            </Box>

            {/* FAQ excerpt */}
            <Box as="section" py={{ base: 16, md: 20 }} bg="bg.card" aria-label="よくある質問">
                <Container maxW="container.md">
                    <SectionHeading title="よくある質問" />
                    <Accordion allowMultiple>
                        {faqItems.slice(0, 5).map((item) => (
                            <AccordionItem key={item.question}>
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
                            すべての質問を見る
                        </Button>
                    </Flex>
                </Container>
            </Box>

            {/* CTA */}
            <Box as="section" py={{ base: 16, md: 20 }} aria-label="イベント作成">
                <Container maxW="container.md">
                    <VStack
                        spacing={6}
                        p={{ base: 8, md: 12 }}
                        borderRadius="2xl"
                        bgGradient="linear(to-r, brand.600, purple.600)"
                        textAlign="center"
                        color="white"
                    >
                        <Icon as={Link2} boxSize={10} />
                        <Heading as="h2" size="lg">
                            URLを送るだけの日程調整を、今すぐ
                        </Heading>
                        <Text fontSize="lg">登録不要・無料。作成は1分で完了します。</Text>
                        <Button
                            as={NextLink}
                            href="/create"
                            size="lg"
                            bg="white"
                            color="brand.700"
                            _hover={{ bg: 'gray.100' }}
                            rightIcon={<ArrowRight size={18} />}
                        >
                            イベントを作成する
                        </Button>
                    </VStack>
                </Container>
            </Box>
        </PageShell>
    );
}
