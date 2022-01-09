import * as React from 'react'
import { useState, useRef } from 'react'
import { VStack, Heading, Stack, Box, Input, Button }  from "@chakra-ui/react"

// 予定参加者記入コンポーネント

export interface ScheduleCandidateProps  {
    onSubmit: (participant: string) => void 
}

const ScheduleParticipant = (props: ScheduleCandidateProps) => {    

    const inputParticipant = useRef(null)
    const [participant, setParticipant] = useState("")

    const addParticipant = () => {
        if (participant !== ""){
            props.onSubmit(participant)
            setParticipant("")
            inputParticipant.current.focus()
        }        
    }

    return (
        <VStack p={1}
                minW={380}>
            <Heading
                size="md"
                mb={2}>
                2. 参加者を追加してください
            </Heading>

            <VStack p={8}
                    width="full"
                    bg="white"
                    alignItems="start"
                    borderRadius="base"
                    shadow="md">

                <Stack width="full">
                    <Box>参加者</Box>
                    <Input
                        width="full"
                        placeholder="名前を入力してください"
                        bg="white"
                        ref={inputParticipant}
                        onKeyDown={
                            (e) => {
                                if ( e.key == "Enter"){
                                    addParticipant()
                                }
                            }
                        }                         
                        onChange={
                            (e) => {
                                setParticipant(e.target.value)
                            }
                        }
                        value={participant} />
                    <Box fontSize="xs"
                         textColor="gray.500">※後で追加することもできます</Box>
                </Stack>

                <VStack width="full"
                        alignContent="center"
                        pt={3}>
                    <Button
                        colorScheme="blue"
                        onClick={() => { 
                            addParticipant()
                        }}>
                    追加
                    </Button>
                </VStack>
            </VStack>
        </VStack>
    )
}

// Propsのデフォルト値
ScheduleParticipant.defaultProps = {
    onSubmit : undefined
}

export default ScheduleParticipant