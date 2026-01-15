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
        },
        results: {}
    })

    const setQuery = (newQuery) => {
        setFlowState(prev => ({ ...prev, query: newQuery }))
    }
    
    const setResults = (newResults) => {
        setFlowState(prev => ({ ...prev, results: newResults }))
    }

    return (
        <FlowContext.Provider value={
            { flowState, setFlowState, query: flowState.query, setQuery, results: flowState.results, setResults }
        }>
            { children }
        </FlowContext.Provider>
    )
}

export const useFlow = () => useContext(FlowContext)