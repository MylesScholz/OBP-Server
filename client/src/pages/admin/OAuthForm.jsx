import styled from '@emotion/styled'

const OAuthFormContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: 10px;

    border: 1px solid #222;
    border-radius: 5px;

    padding: 20px;

    h2 {
        margin: 0px;

        font-size: 16pt;
    }
    
    a {
        display: flex;
        justify-content: center;
        align-items: center;

        padding: 10px;

        border: 1px solid gray;
        border-radius: 5px;

        text-decoration: none;

        background-color: white;

        cursor: pointer;

        &:hover {
            background-color: #efefef;
        }
    }
`

export default function OAuthForm() {
    return (
        <OAuthFormContainer>
            <h2>iNaturalist Account</h2>
            <a id='iNaturalistLogIn'>Log In</a>

            <h2>Google Account</h2>
            <a id='GoogleLogIn'>Log In</a>
        </OAuthFormContainer>
    )
}