import * as React from 'react'
import { useState  } from 'react'
import { VStack, HStack, Heading, Stack, Box, Checkbox, Flex,
Button, Textarea }  from "@chakra-ui/react"
import { SingleDatepicker } from "chakra-dayzed-datepicker"
import TimePicker from '../components/TimePicker'

// 予定詳細記入コンポーネント

const dayNumbers:string[] 
  = ['日', '月', '火', '水', '木', '金', '土']

export interface ScheduleCandidateProps  {
    initialStartHour: number
    initialStartMinute: number,
    initialEndHour: number,
    initialEndMinute: number,    
    onSubmit: (startDate: Date, eDate: Date, notes: string) => void 
}

const ScheduleCandidate = (props: ScheduleCandidateProps) => {    

    const [isOneDay, setIsOneDay] = useState(true)

    const [startHour, setStartHour] = useState(props.initialStartHour)
    const [startMinute, setStartMinute] = useState(props.initialEndMinute)

    const [endHour, setEndHour] = useState(props.initialEndHour)
    const [endMinute, setEndMinute] = useState(props.initialEndMinute) 
  
    const [startMaxHour, setStartMaxHour] = useState(endHour)
    const [startMaxMinute, setStartMaxMinute] = useState(endMinute)
    const [endMinHour, setEndMinHour] = useState(startHour)
    const [endMinMinute, setEndMinMinute] = useState(startMinute)

    const [startDay, setStartDay] = useState<Date>(new Date())
    const [startWeekDay, setStartWeekDay] = useState(dayNumbers[new Date().getDay()])

    const [endDay, setEndDay] = useState<Date>(new Date())
    const [endWeekDay, setEndWeekDay] = useState(dayNumbers[new Date().getDay()])

    const [notes, setNotes] = useState<string>("")

    
    return (
        <VStack p={1}
                minW={380}>

            <Heading size="md"
                     mb={2}>
                3. 候補日を入力してください
            </Heading>

            <VStack p={8}
                    width="full"
                    bg="white"
                    alignItems="start"
                    borderRadius="base"
                    shadow="md">

                <Stack width="100%">
                    <Flex>
                        <Flex flex="1">開始日</Flex>
                        <Checkbox isChecked={isOneDay}
                                  visibility="collapse"
                                  onChange={() => {
                                    let isNewState = !isOneDay
                                    setIsOneDay(isNewState)
                                    if (isNewState){
                                        setEndWeekDay(dayNumbers[startDay.getDay()])
                                        setEndDay(startDay)
                                    }
                                }}
                                >
                            当日中
                        </Checkbox>
                    </Flex>
                    <HStack bg="white"
                            direction="column">
                        <SingleDatepicker date={startDay}
                                          onDateChange={(date) => { 
                                            setStartWeekDay(dayNumbers[date.getDay()])
                                            setStartDay(date)
                                            if (date > endDay){
                                                setStartDay(startDay)
                                            }
                                          }}/>
                        <Box color={
                                (startWeekDay == "日") ? "red" : (startWeekDay == "土") ? "blue" : "black"
                                }>
                            ({startWeekDay})
                        </Box>
                    </HStack>
                </Stack>
                <Stack width="full">
                    <Box mt={5}>開始時刻</Box>
                    <TimePicker initialHour={props.initialStartHour}
                                initialMinute={props.initialStartMinute}
                                sliderStep={15} 
                                limitMaxHour={startMaxHour}
                                limitMaxMinute={startMaxMinute}
                                onTimeChange={(hour,min) => {
                                    setStartHour(hour)
                                    setStartMinute(min)

                                    // 終了時間のLimit(最小)を変更
                                    setEndMinHour(hour)
                                    setEndMinMinute(min)                                    
                                }}/>
                </Stack>

                <Stack width="full"
                       visibility={!isOneDay ? "visible" : "collapse"}
                       height={!isOneDay ? "full" : 0}
                       >
                    <Box mt={5}>終了日</Box>
                    <HStack bg="white"
                            direction="column">
                        <SingleDatepicker date={endDay}
                                          onDateChange={(date) => { 
                                            setEndWeekDay(dayNumbers[date.getDay()])
                                            setEndDay(date)
                                            if (date < startDay){
                                                setEndDay(endDay)
                                            }                                        
                                          }}/>
                        <Box color={
                                (endWeekDay == "日") ? "red" : (endWeekDay == "土") ? "blue" : "black"
                                }>
                            ({endWeekDay})
                        </Box>
                    </HStack>
                </Stack>
                <Stack width="full">
                    <Box>終了時刻</Box>
                    <TimePicker initialHour={props.initialEndHour}
                                initialMinute={props.initialEndMinute}
                                sliderStep={15} 
                                limitMinHour={endMinHour}
                                limitMinMinute={endMinMinute}
                                onTimeChange={(hour,min) => {
                                    setEndHour(hour)
                                    setEndMinute(min)

                                    // 開始時間のLimit(最大)を変更
                                    setStartMaxHour(hour)
                                    setStartMaxMinute(min)                                   
                                }}/>
                </Stack>

                <Stack width="full">
                    <Box mt={5}>備考</Box>
                    <Textarea placeholder="備考"
                              bg="white"
                              size="sm"
                              value={notes}
                              onChange={(e) => {
                                  setNotes(e.target.value)
                              }}/>
                </Stack>

                <VStack width="full"
                        alignContent="center"
                        pt={5}>
                    <Button colorScheme="blue" onClick={() => { 
                            // 追加ボタン押下
                            let sDate = new Date(startDay)
                            sDate.setHours(startHour)
                            sDate.setMinutes(startMinute)
                            sDate.setSeconds(0)
                            sDate.setMilliseconds(0)                            

                            let eDate = new Date(endDay)
                            eDate.setHours(endHour)
                            eDate.setMinutes(endMinute)
                            eDate.setSeconds(0)
                            eDate.setMilliseconds(0)                                 

                            if (typeof(props) != "undefined"){
                                props.onSubmit(sDate, eDate, notes)
                            }                        
                        }}>
                        追加
                    </Button>
                </VStack>
            </VStack>
        </VStack>
    )
}

// Propsのデフォルト値
ScheduleCandidate.defaultProps = {
    initialStartHour: 8,
    initialStartMinute: 0,
    initialEndHour: 9,
    initialEndMinute: 0,
    onSubmit : undefined
}

export default ScheduleCandidate