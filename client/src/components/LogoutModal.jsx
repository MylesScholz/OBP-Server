import styled from '@emotion/styled'

const LogoutModalContainer = styled.div`
    position: absolute;
    top: 30px;
    right: 0px;

    display: flex;
    flex-direction: column;
    gap: 5px;

    padding: 15px;

    white-space: nowrap;

    background-color: white;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);

    color: black;

    input {
        border: 1px solid #222;
        border-radius: 5px;

        padding: 5px;

        font-size: 12pt;

        background-color: white;

        &:hover {
            background-color: #efefef;
        }
    }
`

export default function LogoutModal() {
    return (
        <LogoutModalContainer>
            <input type='submit' id='logoutSubmit' value='Log Out' />
        </LogoutModalContainer>
    )
}