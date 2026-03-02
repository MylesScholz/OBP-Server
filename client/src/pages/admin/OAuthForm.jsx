import { useQuery } from '@tanstack/react-query'
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

    p {
        margin: 0px;

        font-size: 12pt;
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

        &:link, &:visited {
            color: #222;
        }
    }
`

export default function OAuthForm() {
    const iNaturalistAuthBaseUrl = 'https://www.inaturalist.org'
    const iNaturalistClientId = import.meta.env.VITE_INATURALIST_CLIENT_ID ?? ''
    const iNaturalistRedirectUri = import.meta.env.VITE_INATURALIST_REDIRECT_URL ?? ''
    const iNaturalistAuthUrl = `${iNaturalistAuthBaseUrl}/oauth/authorize?client_id=${iNaturalistClientId}&redirect_uri=${iNaturalistRedirectUri}&response_type=code`

    const { data: authorization, isLoading } = useQuery({
        queryKey: [ 'authorizationQuery' ],
        queryFn: async () => {
            const response = await fetch('/api/oauth/check')
            return await response.json()
        },
        refetchOnMount: 'always'
    })

    return (
        <OAuthFormContainer>
            <h2>iNaturalist Account</h2>
            { isLoading ? (
                <p>Loading...</p>
            ) : (
                authorization?.iNaturalistAuthorization ? (
                    <p>Authorized</p>
                ) : (
                    <a
                        id='iNaturalistAuthorize'
                        href={iNaturalistAuthUrl}
                    >Authorize</a>
                )
            )}

            <h2>Google Account</h2>
            { isLoading ? (
                <p>Loading...</p>
            ) : (
                authorization?.GoogleAuthorization ? (
                    <p>Authorized</p>
                ) : (
                    <a id='GoogleAuthorize'>Authorize</a>
                )
            )}
        </OAuthFormContainer>
    )
}