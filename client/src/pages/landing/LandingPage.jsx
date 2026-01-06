import styled from '@emotion/styled'
import { Link } from 'react-router'
import { useAuth } from '../../AuthProvider'

const LandingPageContainer = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;

    padding: 50px;

    #rolePrompt {
        margin: 0px;

        font-size: 20pt;

        text-align: center;
    }

    #roleContainer {
        display: flex;
        flex-direction: row;
        justify-content: center;
        gap: 50px;

        a {
            margin: 0px;

            border: 1px solid #222;
            border-radius: 5px;

            padding: 20px;

            font-size: 16pt;
            text-decoration: none;

            background-color: white;

            &:link, &:visited {
                color: #222;
            }

            &:hover {
                background-color: #efefef;
            }
        }
    }
`

export default function LandingPage() {
    const { loggedIn } = useAuth()

    console.log('/:', loggedIn)

    return (
        <LandingPageContainer>
            <h2 id='rolePrompt'>Select your role</h2>
            <div id='roleContainer'>
                <Link to={loggedIn ? '/dashboard' : '/adminLogin'}>Administrator</Link>
                <Link to='/volunteerLogin'>Volunteer</Link>
            </div>
        </LandingPageContainer>
    )
}