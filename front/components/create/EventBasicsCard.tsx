'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Input,
    Button,
    FormControl,
    FormLabel,
    FormErrorMessage,
    FormHelperText,
    Textarea,
    Collapse,
    useColorModeValue,
    useDisclosure,
    Wrap,
    WrapItem,
    Tag,
} from '@chakra-ui/react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface EventBasicsCardProps {
    register: UseFormRegister<any>;
    errors: FieldErrors;
    organizerName: string;
    onOrganizerChange: (name: string) => void;
    defaultOrganizerName?: string;
    isSimpleMode: boolean;
    // Detailed mode fields
    description: string;
    onDescriptionChange: (value: string) => void;
    ownerEmail: string;
    onOwnerEmailChange: (value: string) => void;
}

const EVENT_NAME_TEMPLATES = ['チームMTG', '1on1', '面談', '飲み会', 'ランチ', '打合せ'];

export function EventBasicsCard({
    register,
    errors,
    organizerName,
    onOrganizerChange,
    defaultOrganizerName,
    isSimpleMode,
    description,
    onDescriptionChange,
    ownerEmail,
    onOwnerEmailChange,
}: EventBasicsCardProps) {
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.400', 'gray.500');
    const inputBorderColor = useColorModeValue('gray.300', 'gray.500');
    const optionsBorderColor = useColorModeValue('gray.200', 'gray.600');
    const optionsBgColor = useColorModeValue('gray.50', 'gray.700');
    const [organizerExpanded, setOrganizerExpanded] = useState(false);
    const { isOpen: optionsOpen, onToggle: onOptionsToggle } = useDisclosure();

    // Auto-fill organizer on mount
    useEffect(() => {
        if (!organizerName && defaultOrganizerName) {
            onOrganizerChange(defaultOrganizerName);
        }
    }, [defaultOrganizerName, organizerName, onOrganizerChange]);

    return (
        <Box
            bg={cardBg}
            borderRadius="lg"
            border="1px solid"
            borderColor={borderColor}
            p={3}
        >
            <VStack spacing={2} align="stretch">
                {!isSimpleMode && (
                    <Text fontSize="sm" fontWeight="semibold">
                        基本情報
                    </Text>
                )}

                {/* Event name */}
                <FormControl isInvalid={!!errors.title}>
                    <FormLabel fontSize="sm" mb={0.5}>
                        イベント名<Text as="span" color="red.500">*</Text>
                    </FormLabel>
                    <Input
                        {...register('title')}
                        placeholder="例：チームMTG（あとで変更できます）"
                        size="sm"
                        borderColor={inputBorderColor}
                    />
                    {errors.title && (
                        <FormErrorMessage>{errors.title.message as string}</FormErrorMessage>
                    )}
                </FormControl>

                {/* Quick templates */}
                <Wrap spacing={2}>
                    {EVENT_NAME_TEMPLATES.map((template) => (
                        <WrapItem key={template}>
                            <Tag
                                size="sm"
                                variant="outline"
                                colorScheme="brand"
                                cursor="pointer"
                                onClick={() => {
                                    const input = document.querySelector('input[name="title"]') as HTMLInputElement;
                                    if (input) {
                                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                                            window.HTMLInputElement.prototype,
                                            'value'
                                        )?.set;
                                        nativeInputValueSetter?.call(input, template);
                                        input.dispatchEvent(new Event('input', { bubbles: true }));
                                    }
                                }}
                                _hover={{ bg: 'brand.50' }}
                            >
                                {template}
                            </Tag>
                        </WrapItem>
                    ))}
                </Wrap>

                {/* Organizer - same behavior for both modes (collapsed by default) */}
                <Box>
                    {!organizerExpanded ? (
                        <HStack>
                            <Text fontSize="sm" color="gray.600">
                                主催者：{organizerName || '未設定'}
                            </Text>
                            <Button
                                size="xs"
                                variant="link"
                                colorScheme="brand"
                                onClick={() => setOrganizerExpanded(true)}
                            >
                                変更
                            </Button>
                        </HStack>
                    ) : (
                        <FormControl>
                            <FormLabel fontSize="sm" mb={0.5}>主催者名</FormLabel>
                            <HStack>
                                <Input
                                    value={organizerName}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onOrganizerChange(e.target.value)}
                                    placeholder="主催者の名前"
                                    size="sm"
                                    borderColor={inputBorderColor}
                                />
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setOrganizerExpanded(false)}
                                >
                                    閉じる
                                </Button>
                            </HStack>
                        </FormControl>
                    )}
                </Box>

                {/* Detailed mode: Collapsible options for email and description */}
                {!isSimpleMode && (
                    <Box>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onOptionsToggle}
                            leftIcon={optionsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            color="gray.600"
                            fontWeight="normal"
                        >
                            オプション
                        </Button>

                        <Collapse in={optionsOpen} animateOpacity>
                            <Box
                                mt={2}
                                p={4}
                                borderRadius="md"
                                border="1px solid"
                                borderColor={optionsBorderColor}
                                bg={optionsBgColor}
                            >
                                <VStack spacing={4} align="stretch">
                                    {/* Email */}
                                    <FormControl>
                                        <FormLabel fontSize="sm" mb={0.5}>メールアドレス（任意）</FormLabel>
                                        <Input
                                            type="email"
                                            value={ownerEmail}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onOwnerEmailChange(e.target.value)}
                                            placeholder="回答時の通知を受け取るメールアドレス"
                                            size="sm"
                                            borderColor={inputBorderColor}
                                        />
                                        <FormHelperText fontSize="xs">
                                            回答があった際に通知を受け取れます
                                        </FormHelperText>
                                    </FormControl>

                                    {/* Description */}
                                    <FormControl>
                                        <FormLabel fontSize="sm" mb={0.5}>説明・メモ（任意）</FormLabel>
                                        <Textarea
                                            value={description}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onDescriptionChange(e.target.value)}
                                            placeholder="イベントの詳細や補足情報を記入してください"
                                            size="sm"
                                            rows={3}
                                            borderColor={inputBorderColor}
                                        />
                                    </FormControl>
                                </VStack>
                            </Box>
                        </Collapse>
                    </Box>
                )}
            </VStack>
        </Box>
    );
}
