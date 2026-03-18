import { useState } from 'react'
import styled from '@emotion/styled'

const ConfirmationModalContainer = styled.div`
    z-index: 10000;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;

    display: flex;
    justify-content: center;
    align-items: center;

    background-color: rgba(0, 0, 0, 0.1);

    user-select: none;
    -webkit-user-select: none;

    .modal {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-auto-rows: 1fr;
        grid-column-gap: 15px;
        grid-row-gap: 15px;

        border: 1px solid #222;
        border-radius: 5px;

        padding: 20px;

        background-color: white;

        p {
            grid-column: 1 / 3;

            margin: 0px;

            font-size: 12pt;

            text-align: center;
        }

        button {
            border: 1px solid gray;
            border-radius: 5px;

            padding: 5px;

            background-color: white;

            &:hover {
                background-color: #efefef;
            }
        }

        .confirm {
            background-color: #c00;
            color: white;

            &:hover {
                background-color: #ef0000;
            }
        }
    }
`

// Pass in useState "modalEnabled" and "setModalEnabled",
// "callback" to execute on clicking confirm,
// modalText, confirmText (optional), cancelText (optional)
export default function ConfirmationModal(props) {

    const modalText = props.modalText || 
        "Are you sure you wish to continue?"
    const cancelText = props.cancelText || "Cancel"
    const confirmText = props.confirmText || "Confirm"

    // onKeyDown={(event) => { if (event.key === 'Escape') setShowLogoutModal(false) } }
    return (
        <>
            { props.modalEnabled && 
                <ConfirmationModalContainer>
                    <div className='modal'>
                        <p>{modalText}</p>

                        <button onClick={(event) => {
                            event.preventDefault()
                            props.setModalEnabled(false)
                        }}>{cancelText}</button>

                        <button className='confirm' onClick={(event) => {
                            event.preventDefault()
                            props.callback()
                            props.setModalEnabled(false)
                        }}>{confirmText}</button>
                    </div>
                </ConfirmationModalContainer>
            }
        </>
    )
}
