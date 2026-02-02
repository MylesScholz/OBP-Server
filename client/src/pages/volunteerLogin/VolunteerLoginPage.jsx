import styled from '@emotion/styled'

import VolunteerLoginForm from './VolunteerLoginForm'

const VolunteerLoginPageContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;

    padding: 50px;
`

export default function VolunteerLoginPage() {
    return (
        <VolunteerLoginPageContainer>
            <VolunteerLoginForm />
        </VolunteerLoginPageContainer>
    )
}