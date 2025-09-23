import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Global, css } from '@emotion/react'

import App from './App'

const queryClient = new QueryClient()

const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
    }
])

const globalStyles = css`
    html {
        font-family: 'Helvetica', sans-serif;

        --occurrences-file-color: #ceb721;
        --duplicates-file-color: #d75fdd;
        --pulls-file-color: #00e068;
        --flags-file-color: #c33333;
        --labels-file-color: #2916fc;
        --addresses-file-color: #930082;
        --emails-file-color: #07b2b2;
        --pivots-file-color: #9794f7;
    }

    body {
        margin: 0px;
    }
`

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <Global styles={globalStyles} />
            <RouterProvider router={router} />
        </QueryClientProvider>
    </React.StrictMode>
)