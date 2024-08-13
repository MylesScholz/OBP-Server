import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Global, css } from '@emotion/react'

import App from './App'

const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
    }
])

const globalStyles = css``

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Global styles={globalStyles} />
        <RouterProvider router={router} />
    </React.StrictMode>
)