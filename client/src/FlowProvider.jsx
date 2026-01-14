import { createContext, useContext, useState } from 'react'

const FlowContext = createContext()

export function FlowProvider({ children }) {
    const [ flowState, setFlowState ] = useState({
        query: {
            page: 1,
            per_page: 25,
            fieldName: '',
            queryText: '',
            minDate: '',
            maxDate: '',
            url: '',
            totalDocuments: 0
        }
    })

    const setQuery = (newQuery) => {
        setFlowState({ ...flowState, query: newQuery })
    }

    return (
        <FlowContext.Provider value={{ flowState, setFlowState, query: flowState.query, setQuery }}>
            { children }
        </FlowContext.Provider>
    )
}

export const useFlow = () => useContext(FlowContext)