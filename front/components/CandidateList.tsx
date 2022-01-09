import * as React from 'react'
import { VStack, HStack, Box, Button, Text }  from "@chakra-ui/react"
import { Candidate } from '../interfaces/candidate'

// 候補日時リストコンポーネント

const formatDate = (dt: Date) : string =>  {
    const m = ("00" + (dt.getMonth()+1)).slice(-2)
    const d = ("00" + dt.getDate()).slice(-2)
    return dt.getFullYear() + "-" + m + "-" + d
}
  
const formatTime = (dt: Date) : string =>  {
    const h = ("00" + dt.getHours()).slice(-2)
    const m = ("00" + dt.getMinutes()).slice(-2)
    return h + ":" + m
}

const compareYmd = (dt: Date, et: Date): boolean =>{
    return (
         dt.getFullYear() == et.getFullYear() &&
         dt.getMonth() == et.getMonth() &&
         dt.getDate() == et.getDate()
    )
}

export interface CandidateListProps  {
    candidates: Candidate[]
    onDelete: (idx: number) => void 
}

const CandidateList = (props: CandidateListProps) => {
    return (
        <VStack alignItems="start"
                mt={10}>
            <Box minW={80}
                 fontWeight="bold">
                候補日時
            </Box>
            <Box width="100%">
                {props.candidates.map((elm,idx) => (
                    <HStack borderBottomWidth="thin"
                            p={1}
                            width="full"
                            bg="white"
                            key={`${idx}-${elm}`}
                        >
                        <Box ml={4}
                             mr={2}>
                            {formatDate(elm.startDate)}
                        </Box>

                        {compareYmd(elm.startDate,elm.endDate) ?
                            (
                                <Box ml={2}
                                    flex="1"
                                    color="blue.600">
                                    {`${formatTime(elm.startDate)} - ${formatTime(elm.endDate)}`}
                                </Box>
                            ):(
                                <HStack>
                                    <Box
                                        color="blue.600">
                                        {`${formatTime(elm.startDate)} - `}
                                    </Box>
                                    <Box ml={4}
                                        mr={2}>
                                        {formatDate(elm.endDate)}
                                    </Box>
                                    <Box flex="1"
                                         color="blue.600">
                                        {formatTime(elm.endDate)}
                                    </Box>                                    
                                </HStack>
                            )
                        }

                        <Text ml={5} 
                             color="gray.600">
                            {elm.notes}
                        </Text>                        

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
CandidateList.defaultProps = {
    onDelete : undefined
}

export default CandidateList