import * as React from 'react'
import { useState } from 'react';
import { VStack, Heading, FormControl, FormLabel, Input,
    InputGroup, InputRightElement, Button, Textarea
}  from "@chakra-ui/react"
import { ScheduleInformation } from '../interfaces/scheduleInformation';

// 予定詳細記入コンポーネント

export interface ScheduleDetailProps  {
    onChange?: (schedule: ScheduleInformation) => void // スケジュールが変更されたときのコールバック関数
}

const ScheduleDetail = (props: ScheduleDetailProps) => {
    const [showPassword, setShowPassword] = useState(false)

    const copySchedule = () : ScheduleInformation => {
        let newSchedule : ScheduleInformation = {
            meeting : schedule.meeting,
            owner : schedule.owner,
            department : schedule.department,
            delkey : schedule.delkey,
            comment : schedule.comment
        }
        return newSchedule
    }

    // 現在入力されているスケジュールを保持する
    const [schedule, setSchedule] = useState<ScheduleInformation>(
        {
            meeting : "",
            owner : "",
            department : "",
            delkey : "",
            comment : ""
        }
    )

    return (      
        <VStack p={1}
                minW={380}>
            <Heading size="md"
                     mb={2}>
                    1. 予定を入力してください
            </Heading>      

            <VStack p={8}
                    width="full"
                    bg="white"
                    borderRadius="base"
                    shadow="md">

                <FormControl isRequired >
                    <FormLabel>予定名</FormLabel>
                    <Input placeholder="予定名"
                           bg="white"
                           value={schedule.meeting}
                           onChange={
                            (e:React.ChangeEvent<HTMLInputElement>) => {
                                let newSchedule = copySchedule()
                                newSchedule.meeting = e.target.value
                                setSchedule(newSchedule)
                                props.onChange(newSchedule)
                            }}/>
                </FormControl>

                <FormControl isRequired >
                    <FormLabel >主催者</FormLabel>
                    <Input placeholder="主催者"
                           bg="white"
                           value={schedule.owner}
                           onChange={
                            (e:React.ChangeEvent<HTMLInputElement>) => {
                                let newSchedule = copySchedule()
                                newSchedule.owner = e.target.value
                                setSchedule(newSchedule)
                                props.onChange(newSchedule)
                            }}/>
                </FormControl>

                <FormControl>
                    <FormLabel>所属</FormLabel>
                    <Input placeholder="所属"
                           bg="white"
                           value={schedule.department}
                           onChange={
                            (e:React.ChangeEvent<HTMLInputElement>) => {
                                let newSchedule = copySchedule()
                                newSchedule.department = e.target.value
                                setSchedule(newSchedule)
                                props.onChange(newSchedule)
                            }}/>
                </FormControl>

                <FormControl>
                    <FormLabel>削除キー</FormLabel>
                    <InputGroup size="md">
                    <Input
                        pr="4.5rem"
                        type={showPassword ? "text" : "password"}
                        placeholder="削除キー"
                        value={schedule.delkey}
                        onChange={
                         (e:React.ChangeEvent<HTMLInputElement>) => {
                             let newSchedule = copySchedule()
                             newSchedule.delkey = e.target.value
                             setSchedule(newSchedule)
                             props.onChange(newSchedule)
                         }}/>
                    <InputRightElement width="4.5rem">
                        <Button h="1.75rem"
                                size="sm"
                                onClick={ () => setShowPassword(!showPassword)}>
                            {showPassword ? "非表示" : "表示"}
                        </Button>
                    </InputRightElement>
                    </InputGroup>
                </FormControl>          

                <FormControl>
                    <FormLabel>コメント</FormLabel>
                    <Textarea placeholder="コメントを記入してください"
                              bg="white"
                              size="sm"
                              value={schedule.comment}
                              onChange={
                               (e:React.ChangeEvent<HTMLTextAreaElement>) => {
                                   let newSchedule = copySchedule()
                                   newSchedule.comment = e.target.value
                                   setSchedule(newSchedule)
                                   props.onChange(newSchedule)
                               }}/>
                </FormControl>          
            </VStack>
        </VStack>
     )
}

export default ScheduleDetail