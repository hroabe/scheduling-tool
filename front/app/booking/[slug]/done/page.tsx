'use client';

/**
 * 予約完了ページ
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
    Box,
    Container,
    VStack,
    Heading,
    Text,
    Card,
    CardBody,
    Button,
    HStack,
    Icon,
    Spinner,
    useColorModeValue,
} from '@chakra-ui/react';
import { Check, Calendar, Clock, User, Mail } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function BookingDonePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const slug = params.slug as string;
    const rid = searchParams.get('rid');
    
    const [booking, setBooking] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const cardBg = useColorModeValue('white', 'gray.800');

    useEffect(() => {
        if (rid) {
            fetch(`/api/v1/oneonone/booking/${rid}/`)
                .then(res => res.json())
                .then(data => {
                    setBooking(data);
                    setIsLoading(false);
                })
                .catch(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [rid]);

    return (
        <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
            <Header />
            <Container maxW="container.sm" py={16}>
                <VStack spacing={8}>
                    <Box
                        w={20}
                        h={20}
                        borderRadius="full"
                        bg="green.100"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <Icon as={Check} boxSize={10} color="green.500" />
                    </Box>
                    
                    <VStack spacing={2}>
                        <Heading size="lg" color="green.600">予約が完了しました！</Heading>
                        <Text color="gray.600">確認メールをお送りしました</Text>
                    </VStack>

                    {isLoading ? (
                        <Spinner />
                    ) : booking && (
                        <Card w="full" bg={cardBg}>
                            <CardBody>
                                <VStack align="stretch" spacing={4}>
                                    <Text fontWeight="bold" fontSize="lg">{booking.page_title}</Text>
                                    
                                    <HStack>
                                        <Icon as={Calendar} color="gray.500" />
                                        <Text>
                                            {booking.slot_info && format(
                                                new Date(booking.slot_info.start_at),
                                                'yyyy年M月d日 (E) HH:mm',
                                                { locale: ja }
                                            )}
                                            <Text as="span" color="gray.500"> 〜 </Text>
                                            {booking.slot_info && format(
                                                new Date(booking.slot_info.end_at),
                                                'HH:mm'
                                            )}
                                        </Text>
                                    </HStack>
                                    
                                    <HStack>
                                        <Icon as={User} color="gray.500" />
                                        <Text>主催者: {booking.host_name}</Text>
                                    </HStack>
                                    
                                    <HStack>
                                        <Icon as={Mail} color="gray.500" />
                                        <Text>{booking.guest_email}</Text>
                                    </HStack>
                                </VStack>
                            </CardBody>
                        </Card>
                    )}

                    <VStack spacing={4} w="full">
                        <Button
                            colorScheme="blue"
                            size="lg"
                            w="full"
                            leftIcon={<Calendar size={18} />}
                            onClick={() => {
                                // Generate .ics file (simplified)
                                toast({
                                    title: 'カレンダーに追加',
                                    description: '(準備中)',
                                    status: 'info',
                                });
                            }}
                        >
                            カレンダーに追加
                        </Button>
                        
                        <Button
                            variant="outline"
                            onClick={() => router.push('/')}
                        >
                            トップに戻る
                        </Button>
                    </VStack>
                </VStack>
            </Container>
            <Footer />
        </Box>
    );
}

// Toast placeholder
const toast = (opts: any) => console.log(opts);
