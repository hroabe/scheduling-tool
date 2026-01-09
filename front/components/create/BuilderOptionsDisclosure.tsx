'use client';

import {
    Box,
    VStack,
    HStack,
    Text,
    Button,
    Switch,
    Select,
    Collapse,
    useDisclosure,
    useColorModeValue,
    FormControl,
    FormLabel,
    RadioGroup,
    Radio,
    Stack,
} from '@chakra-ui/react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface BuilderOptionsDisclosureProps {
    // End time direct input
    useDirectEndTime: boolean;
    onUseDirectEndTimeChange: (value: boolean) => void;
    endTimeHour: number;
    endTimeMinute: number;
    onEndTimeChange: (hour: number, minute: number) => void;
    
    // Minute step
    minuteStep: 5 | 1;
    onMinuteStepChange: (step: 5 | 1) => void;
    
    // Nudge callbacks
    onNudge: (minutes: number) => void;
    
    // Hour/minute options
    hourOptions: number[];
    getMinuteOptions: () => number[];
}

export function BuilderOptionsDisclosure({
    useDirectEndTime,
    onUseDirectEndTimeChange,
    endTimeHour,
    endTimeMinute,
    onEndTimeChange,
    minuteStep,
    onMinuteStepChange,
    onNudge,
    hourOptions,
    getMinuteOptions,
}: BuilderOptionsDisclosureProps) {
    const { isOpen, onToggle } = useDisclosure();
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const bgColor = useColorModeValue('gray.50', 'gray.700');

    return (
        <Box>
            <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                leftIcon={isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                color="gray.600"
                fontWeight="normal"
            >
                オプション
            </Button>
            
            <Collapse in={isOpen} animateOpacity>
                <Box
                    mt={2}
                    p={4}
                    borderRadius="md"
                    border="1px solid"
                    borderColor={borderColor}
                    bg={bgColor}
                >
                    <VStack spacing={4} align="stretch">
                        {/* End time direct input toggle */}
                        <FormControl display="flex" alignItems="center">
                            <Switch
                                id="direct-end-time"
                                isChecked={useDirectEndTime}
                                onChange={(e) => onUseDirectEndTimeChange(e.target.checked)}
                                colorScheme="brand"
                                mr={3}
                            />
                            <FormLabel htmlFor="direct-end-time" mb="0" fontSize="sm">
                                終了時刻を直接指定する
                            </FormLabel>
                        </FormControl>
                        
                        {useDirectEndTime && (
                            <HStack spacing={2} pl={4}>
                                <Text fontSize="sm" color="gray.600">終了</Text>
                                <Select
                                    size="sm"
                                    w="70px"
                                    value={endTimeHour}
                                    onChange={(e) => onEndTimeChange(parseInt(e.target.value), endTimeMinute)}
                                >
                                    {hourOptions.map(h => (
                                        <option key={h} value={h}>
                                            {h.toString().padStart(2, '0')}
                                        </option>
                                    ))}
                                </Select>
                                <Text>:</Text>
                                <Select
                                    size="sm"
                                    w="70px"
                                    value={endTimeMinute}
                                    onChange={(e) => onEndTimeChange(endTimeHour, parseInt(e.target.value))}
                                >
                                    {getMinuteOptions().map(m => (
                                        <option key={m} value={m}>
                                            {m.toString().padStart(2, '0')}
                                        </option>
                                    ))}
                                </Select>
                            </HStack>
                        )}
                        
                        {/* Minute step */}
                        <FormControl>
                            <FormLabel fontSize="sm" mb={2}>刻み</FormLabel>
                            <RadioGroup
                                value={minuteStep.toString()}
                                onChange={(val) => onMinuteStepChange(parseInt(val) as 5 | 1)}
                            >
                                <Stack direction="row" spacing={4}>
                                    <Radio value="5" colorScheme="brand" size="sm">5分</Radio>
                                    <Radio value="1" colorScheme="brand" size="sm">1分</Radio>
                                </Stack>
                            </RadioGroup>
                        </FormControl>
                        
                        {/* Nudge buttons */}
                        <FormControl>
                            <FormLabel fontSize="sm" mb={2}>微調整</FormLabel>
                            <HStack spacing={2} flexWrap="wrap">
                                <Button size="xs" variant="outline" onClick={() => onNudge(-60)}>-60</Button>
                                <Button size="xs" variant="outline" onClick={() => onNudge(-30)}>-30</Button>
                                <Button size="xs" variant="outline" onClick={() => onNudge(-15)}>-15</Button>
                                <Button size="xs" variant="outline" onClick={() => onNudge(15)}>+15</Button>
                                <Button size="xs" variant="outline" onClick={() => onNudge(30)}>+30</Button>
                                <Button size="xs" variant="outline" onClick={() => onNudge(60)}>+60</Button>
                            </HStack>
                        </FormControl>
                    </VStack>
                </Box>
            </Collapse>
        </Box>
    );
}
