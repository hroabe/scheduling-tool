import { useState, useEffect } from 'react'
import { AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, 
AlertDialogBody, AlertDialogFooter, Button, HStack }  from "@chakra-ui/react"
import { ScheduleInformation } from '../interfaces/scheduleInformation';
import { Candidate } from '../interfaces/candidate'

export interface ConfirmScheduleAlertDialogProps  {
    scheduleInfo : ScheduleInformation
    participants : string[]
    candidates : Candidate[]
    isOpen : boolean
    onClose: () => void 
}

const ConfirmScheduleAlertDialog = (props: ConfirmScheduleAlertDialogProps) => {
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        setIsOpen(props.isOpen)
    },[props.isOpen])

    return (
        <AlertDialog
            isOpen={isOpen}
            leastDestructiveRef={null}
            onClose={() => {
                setIsOpen(false)
                props.onClose()
            }}
            >
            <AlertDialogOverlay />

            <AlertDialogContent>
                <AlertDialogHeader fontSize="lg" fontWeight="bold">
                    確認
                </AlertDialogHeader>

                <AlertDialogBody>
                    {props.scheduleInfo?.meeting}
                    {props.scheduleInfo?.owner}
                    {props.scheduleInfo?.department}
                    {props.scheduleInfo?.delkey}
                    {props.scheduleInfo?.comment}
                    {props.participants?.map((elm,i)=> {
                        return (<div key={i}>{elm}</div>)
                    })}
                    {props.candidates?.map(elm => {
                        elm.startDate + "-" + elm.endDate + " " + elm.notes
                    })}                    
                </AlertDialogBody>

                <AlertDialogFooter>
                    <HStack >
                        <Button colorScheme='blue'>
                            登録
                        </Button>                        
                        <Button ref={null} 
                                onClick={() => {
                                    setIsOpen(false)
                                    props.onClose()
                                }}>
                            戻る
                        </Button>
                    </HStack>                    
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

// Propsのデフォルト値
ConfirmScheduleAlertDialog.defaultProps = {
    isOpen: false
}

export default ConfirmScheduleAlertDialog