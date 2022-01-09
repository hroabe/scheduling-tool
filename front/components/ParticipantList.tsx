import * as React from 'react'
import { VStack, HStack, Box, Button }  from "@chakra-ui/react"

// 参加者時リストコンポーネント

export interface CandidateListProps  {
    participants: string[]
    onDelete: (idx: number) => void
}

const ParticipantList = (props: CandidateListProps) => {
    return (
        <VStack alignItems="start"
                mt={5}>
            <Box minW={80}
                 fontWeight="bold">
                参加者
            </Box>
            <Box width="100%">
                {props.participants.map((p,idx) => (
                    <HStack borderBottomWidth="thin"
                            p={1}
                            width="full"
                            bg="white"
                            key={`${idx}-${p}`}
                        >
                        <Box ml={2}
                             flex="1">            
                            {p}
                        </Box>
                        <Button size="sm"
                                colorScheme="blackAlpha" 
                                onClick={
                                    () => {
                                        if (typeof(props.onDelete) != "undefined"){
                                            props.onDelete(idx)
                                        }
                                    }
                                }>
                           削除
                        </Button>
                    </HStack>))
                }
            </Box>
        </VStack>
    )
}

// Propsのデフォルト値
ParticipantList.defaultProps = {
    onDelete : undefined
}

export default ParticipantList