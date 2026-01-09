'use client';

import {
    Box,
    HStack,
    Button,
    Text,
    useColorModeValue,
    useToast,
} from '@chakra-ui/react';
import { Link, Copy, FileText } from 'lucide-react';

interface StickyFooterCTAProps {
    isDisabled: boolean;
    isPending: boolean;
    onCreateAndCopy: () => Promise<string | null>; // Returns URL on success
    onCreateAndNavigate: () => void;
    onSaveDraft?: () => void;
    candidateCount: number;
    hasTitle: boolean;
}

export function StickyFooterCTA({
    isDisabled,
    isPending,
    onCreateAndCopy,
    onCreateAndNavigate,
    onSaveDraft,
    candidateCount,
    hasTitle,
}: StickyFooterCTAProps) {
    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const toast = useToast();

    const handleCreateAndCopy = async () => {
        const url = await onCreateAndCopy();
        if (url) {
            try {
                await navigator.clipboard.writeText(url);
                toast({
                    title: 'リンクをコピーしました',
                    description: 'イベントページのURLがクリップボードにコピーされました',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
            } catch (err) {
                toast({
                    title: 'コピーに失敗しました',
                    description: 'URLを手動でコピーしてください',
                    status: 'warning',
                    duration: 3000,
                    isClosable: true,
                });
            }
        }
    };

    // Determine CTA state
    const getMissingText = () => {
        const missing = [];
        if (!hasTitle) missing.push('イベント名');
        if (candidateCount === 0) missing.push('候補日');
        return missing.join('、');
    };

    const canCreate = hasTitle && candidateCount > 0;

    return (
        <Box
            position="sticky"
            bottom={0}
            left={0}
            right={0}
            bg={bgColor}
            borderTop="1px solid"
            borderColor={borderColor}
            p={4}
            zIndex={10}
            boxShadow="0 -2px 10px rgba(0,0,0,0.1)"
        >
            {!canCreate && (
                <Text fontSize="xs" color="gray.500" textAlign="center" mb={2}>
                    {getMissingText()}を入力してください
                </Text>
            )}
            
            <HStack justify="center" spacing={4} flexWrap="wrap">
                {/* Primary CTA */}
                <Button
                    size="lg"
                    colorScheme="brand"
                    leftIcon={<Copy size={18} />}
                    isDisabled={!canCreate || isPending}
                    isLoading={isPending}
                    onClick={handleCreateAndCopy}
                    px={8}
                >
                    作成してリンクをコピー
                </Button>

                {/* Secondary CTA */}
                <Button
                    size="md"
                    variant="outline"
                    colorScheme="brand"
                    leftIcon={<Link size={16} />}
                    isDisabled={!canCreate || isPending}
                    isLoading={isPending}
                    onClick={onCreateAndNavigate}
                >
                    作成（リンク画面へ）
                </Button>

                {/* Draft button - disabled for now */}
                {onSaveDraft && (
                    <Button
                        size="md"
                        variant="ghost"
                        leftIcon={<FileText size={16} />}
                        isDisabled
                        title="この機能は準備中です"
                    >
                        下書き
                    </Button>
                )}
            </HStack>
        </Box>
    );
}
