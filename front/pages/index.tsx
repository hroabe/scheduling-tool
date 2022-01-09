import Link from 'next/link'
import { Candidate } from '../interfaces/candidate'
import React, { useState } from 'react'
import { ScheduleInformation } from '../interfaces/scheduleInformation';
import ScheduleDetail from "../components/ScheduleDetail"
import { Stack, VStack, HStack, Spacer, Button }  from "@chakra-ui/react"
import ScheduleCandidate from '../components/ScheduleCandidate'
import ScheduleParticipant from '../components/ScheduleParticipant'
import CandidateList from '../components/CandidateList'
import ParticipantList from '../components/ParticipantList'
import SameCandidateAlertDialog from '../components/SameCandidateAlertDialog'
import ConfirmScheduleAlertDialog from '../components/ConfirmScheduleAlertDialog';

// トップページ

const IndexPage = () => { 
  // 予定の詳細
  const [detail, setDetail] = useState<ScheduleInformation>(null)
  // 参加者リスト
  const [participants, setParticipants] = useState<string[]>([])
  // 候補日時リスト
  const [candidates, setCandidates] = useState<Candidate[]>([])
  
  // アラートダイアログの表示状態
  const [isOpenAlertDialog, setIsOpenAlertDialog] = useState(false)
  // 確認ダイアログの表示状態
  const [isConfirmAlertDialog, setIsConfirmAlertDialog] = useState(false)  

  return(
    <VStack bg="gray.100"
            w="full"
            h="full"
            minH="100vh"
            direction="row"            
            > 
      <HStack
        as="header"
        bg="blue.600"
        textColor="white"
        width="full"
        shadow="sm"
        py={4}
        px={8}
      >
        <Stack width="full">
          <>日程調整ツール</>
        </Stack>

        <HStack alignContent="end">
          <>GitHub</>
        </HStack>
      </HStack>

      <HStack p={2}
              alignItems="top" >

        <VStack>
          <ScheduleDetail onChange={(d: ScheduleInformation) => {setDetail(d)}} />
          <Stack mt={2} />
          <ScheduleParticipant onSubmit={
                                  (p) => setParticipants([...participants, p])
                                } />
        </VStack>            

        <Stack>
          <ScheduleCandidate onSubmit={
                              (s: Date, e: Date, n: string) => {
                                const c: Candidate = {
                                  startDate: s,
                                  endDate: e,
                                  notes: n
                                }
                                for(const t of candidates){
                                  if (
                                      (t.startDate.getTime() == c.startDate.getTime()) &&
                                      (t.endDate.getTime() == c.endDate.getTime())
                                    ){
                                      setIsOpenAlertDialog(true)
                                      return
                                    }
                                }
                                setCandidates([...candidates, c])
                              }
                             }/>
          <SameCandidateAlertDialog isOpen={isOpenAlertDialog}
                                    onClose={ () => setIsOpenAlertDialog(false)}/>

        </Stack>    

        <VStack p={2} alignItems="start" >
          <CandidateList candidates={candidates}
                         onDelete={
                           (idx) => {
                              const newItems = [...candidates]
                              newItems.splice(idx,1)
                              setCandidates(newItems)
                           }
                         } />
          <Stack mt={10} />
          <ParticipantList participants={participants}
                           onDelete={
                            (idx) => {
                                const newItems = [...participants]
                                newItems.splice(idx,1)
                                setParticipants(newItems)
                            }
                          } />
          </VStack>          
      </HStack>

      <Stack mt={3} minW="200" >
          <Button colorScheme="blue"
                  mb={3} onClick={
                    () => {
                      // 確認ダイアログを表示
                      if (candidates.length > 0){
                        setIsConfirmAlertDialog(true)
                      }                      
                    }
                  }>
            予定を作成する
          </Button>
          <ConfirmScheduleAlertDialog isOpen={isConfirmAlertDialog}
                                      scheduleInfo={detail}
                                      candidates={candidates}
                                      participants={participants}
                                      onClose={ () => setIsConfirmAlertDialog(false)}/>          
      </Stack>      
    
      <VStack mx="auto"
              borderTopWidth="thin"
              borderTopColor="gray.300">
      </VStack>

    </VStack>
  )
}

export default IndexPage
