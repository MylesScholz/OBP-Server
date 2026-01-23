import { useEffect, useRef, useState } from 'react'
import styled from '@emotion/styled'

import SubtaskCard from './SubtaskCard'

const SubtaskPipelineContainer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: start;
    align-items: stretch;
    gap: 10px;

    border: 1px solid #222;
    border-radius: 5px;

    padding: 15px;

    overflow: scroll;
`

export default function SubtaskPipeline({ taskState, selectedTaskData, downloads }) {
    const [ pipelineState, setPipelineState ] = useState({
        hoveredFile: '',
        ignoreDateLabelPrint: false
    })
    const scrollRef = useRef(null)

    // Convert vertical scrolling into horizontal scrolling
    useEffect(() => {
        const element = scrollRef.current
        if (!element) return

        const handleWheel = (event) => {
            event.preventDefault()

            const scrollAmount = event.deltaX !== 0 ? event.deltaX : event.deltaY

            element.scrollBy({
                left: scrollAmount * 4,
                behavior: 'smooth'
            })
        }

        element.addEventListener('wheel', handleWheel, { passive: false })

        return () => {
            element.removeEventListener('wheel', handleWheel)
        }
    }, [])

    return (
        <SubtaskPipelineContainer ref={scrollRef}>
            { taskState.getEnabledSubtasks().map((type) =>
                <SubtaskCard
                    key={type}
                    type={type}
                    taskState={taskState}
                    pipelineState={pipelineState}
                    setPipelineState={setPipelineState}
                    selectedTaskData={selectedTaskData}
                    downloads={downloads}
                />
            )}
        </SubtaskPipelineContainer>
    )
}