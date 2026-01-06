import styled from '@emotion/styled'
import { useRouteError, Link } from 'react-router'
import { useAuth } from '../../AuthProvider'

const ErrorPageContainer = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr 1fr;
    grid-row-gap: 15px;

    padding: 50px;

    h2 {
        margin: 0px;

        font-size: 20pt;
    }

    p {
        margin: 0px;

        font-size: 16pt;
    }

    a {
        font-size: 16pt;
        text-decoration: none;
        font-weight: bold;

        &:hover {
            text-decoration: underline;
        }

        &:link, &:visited {
            color: #222;
        }
    }
`

export default function ErrorPage() {
    const { loggedIn } = useAuth()
    const error = useRouteError()

    console.log('/error:', loggedIn)

    return (
        <ErrorPageContainer>
            <h2>Error</h2>
            <p>{error.statusText || error.message}</p>
            <Link to='/'>Return to Landing Page</Link>
        </ErrorPageContainer>
    )
}