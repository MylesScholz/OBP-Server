import { useState } from 'react'
import styled from '@emotion/styled'

import addIcon from '/src/assets/add.svg'

const DropdownContainer = styled.data`
    position: relative;

    display: flex;
    flex-direction: center;
    align-items: center;

    border-radius: 5px;

    padding: 0px;

    background-color: white;

    .icon {
        display: flex;
        justify-content: center;
        align-items: center;

        border: 1px solid gray;
        border-radius: 5px;

        padding: 5px;

        &:hover {
            background-color: #dfdfdf;
        }

        img {
            width: 20px;
            height: 20px;
        }
    }

    .selected {
        border: 1px solid gray;
        border-radius: 5px;

        padding: 5px;

        background-color: #efefef;

        &:hover {
            background-color: #dfdfdf;
        }
    }

    #dropdownOptions {
        z-index: 1000;

        position: absolute;
        top: 100%;
        left: 0px;

        display: none;

        margin: 0px;

        border: 1px solid gray;
        border-radius: 5px;

        padding: 5px;

        list-style-type: none;
        background-color: white;

        &.show {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
        }

        li {
            border-radius: 5px;

            padding: 5px;

            cursor: default;
            user-select: none;

            &:hover {
                background-color: #efefef;
            }
        }
    }
`

export default function Dropdown({ options, onChange }) {
    const [ selectedValue, setSelectedValue ] = useState('')
    const [ showOptions, setShowOptions ] = useState(false)

    const selectedOption = options.find((option) => selectedValue === option.value)

    return (
        <DropdownContainer value={selectedValue} onClick={() => setShowOptions(!showOptions)}>
            <div id='selectedSlot'>
                { selectedOption ? (
                    <div key={selectedOption.key} className='selected'>{selectedOption.text}</div>
                ) : (
                    <div className={`icon ${selectedValue === '' ? 'selected' : ''}`}>
                        <img src={addIcon} alt='Add' />
                    </div>
                )}
            </div>
            <ul id='dropdownOptions' className={showOptions && 'show'}>
                { options.map((option) =>
                    <li
                        key={option.key}
                        className={selectedValue === option.value && 'selected'}
                        onClick={(event) => {
                            setSelectedValue(option.value)
                            onChange(option.value, setSelectedValue)
                        }}
                    >{option.text}</li>
                )}
            </ul>
        </DropdownContainer>
    )
}