'use client';

import { useState } from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Input,
    FormControl,
    FormLabel,
    FormHelperText,
    Switch,
    Collapse,
    Button,
    useColorModeValue,
} from '@chakra-ui/react';
import { ChevronDown, ChevronRight, Settings } from 'lucide-react';

interface EventOptionsCardProps {
    editKey: string;
    onEditKeyChange: (value: string) => void;
    deadline: string;
    onDeadlineChange: (value: string) => void;
    allowMaybe: boolean;
    onAllowMaybeChange: (value: boolean) => void;
    notifyOnResponse: boolean;
    onNotifyOnResponseChange: (value: boolean) => void;
    ownerEmail: string;
}

export function EventOptionsCard({
    editKey,
    onEditKeyChange,
    deadline,
    onDeadlineChange,
    allowMaybe,
    onAllowMaybeChange,
    notifyOnResponse,
    onNotifyOnResponseChange,
    ownerEmail,
}: EventOptionsCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.400', 'gray.500');
    const headerBg = useColorModeValue('gray.50', 'gray.700');

    return (
        <Box
            bg={cardBg}
            borderRadius="lg"
            border="1px solid"
            borderColor={borderColor}
            overflow="hidden"
        >
            {/* Collapsible header */}
            <Button
                w="full"
                variant="ghost"
                justifyContent="flex-start"
                py={3}
                px={4}
                bg={headerBg}
                borderRadius="0"
                onClick={() => setIsOpen(!isOpen)}
                leftIcon={isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                _hover={{ bg: useColorModeValue('gray.100', 'gray.600') }}
            >
                <HStack spacing={2}>
                    <Settings size={16} />
                    <Text fontSize="sm" fontWeight="semibold">
                        オプション設定
                    </Text>
                </HStack>
            </Button>

            {/* Collapsible content */}
            <Collapse in={isOpen} animateOpacity>
                <VStack spacing={4} align="stretch" p={4}>
                    {/* Edit key */}
                    <FormControl>
                        <FormLabel fontSize="sm">編集キー（任意）</FormLabel>
                        <Input
                            type="password"
                            value={editKey}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onEditKeyChange(e.target.value)}
                            placeholder="イベント編集用のパスワード"
                            size="sm"
                        />
                        <FormHelperText fontSize="xs">
                            設定すると編集時にパスワードが必要になります
                        </FormHelperText>
                    </FormControl>

                    {/* Deadline */}
                    <FormControl>
                        <FormLabel fontSize="sm">回答期限（任意）</FormLabel>
                        <Input
                            type="datetime-local"
                            value={deadline}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onDeadlineChange(e.target.value)}
                            size="sm"
                        />
                    </FormControl>

                    {/* Allow maybe */}
                    <FormControl display="flex" alignItems="center">
                        <Switch
                            id="allow-maybe"
                            isChecked={allowMaybe}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onAllowMaybeChange(e.target.checked)}
                            colorScheme="brand"
                            mr={3}
                        />
                        <Box>
                            <FormLabel htmlFor="allow-maybe" mb="0" fontSize="sm">
                                「△（調整可能）」を許可
                            </FormLabel>
                            <Text fontSize="xs" color="gray.500">
                                回答に「調整可能」の選択肢を表示します
                            </Text>
                        </Box>
                    </FormControl>

                    {/* Notify on response */}
                    <FormControl display="flex" alignItems="center">
                        <Switch
                            id="notify-on-response"
                            isChecked={notifyOnResponse}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onNotifyOnResponseChange(e.target.checked)}
                            colorScheme="brand"
                            mr={3}
                            isDisabled={!ownerEmail}
                        />
                        <Box>
                            <FormLabel htmlFor="notify-on-response" mb="0" fontSize="sm">
                                回答時にメール通知
                            </FormLabel>
                            <Text fontSize="xs" color="gray.500">
                                {ownerEmail ? '新しい回答があった時にメールで通知します' : 'メールアドレスを入力してください'}
                            </Text>
                        </Box>
                    </FormControl>
                </VStack>
            </Collapse>
        </Box>
    );
}
