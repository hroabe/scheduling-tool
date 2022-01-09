import { useState, useEffect } from 'react'
import { AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, 
AlertDialogBody, AlertDialogFooter, Button }  from "@chakra-ui/react"

export interface SameCandidateAlertDialogProps  {
    isOpen : boolean
    onClose: () => void 
}

const SameCandidateAlertDialog = (props: SameCandidateAlertDialogProps) => {
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
                    エラー
                </AlertDialogHeader>

                <AlertDialogBody>
                    既に追加済みの日時です
                </AlertDialogBody>

                <AlertDialogFooter>
                    <Button ref={null} 
                            onClick={() => {
                                setIsOpen(false)
                                props.onClose()
                            }}>
                        OK
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

// Propsのデフォルト値
SameCandidateAlertDialog.defaultProps = {
    isOpen: false
}

export default SameCandidateAlertDialog