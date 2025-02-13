import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import styled from '@emotion/styled'

const AdminManagementFormContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    border: 1px solid gray;
    border-radius: 5px;

    padding: 20px;

    h2 {
        margin: 0px;
        margin-bottom: 5px;

        font-size: 16pt;
    }

    #adminsQueryPanel {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;

        form {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            gap: 10px;

            fieldset {
                display: flex;
                flex-direction: column;
                gap: 10px;

                margin: 0px;

                border: none;

                padding: 0px;

                font-size: 12pt;

                div {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;

                    white-space: nowrap;
                }
            }
        }

        #adminsQueryResults {
            display: flex;
            flex-direction: column;
            gap: 10px;

            border: 1px solid gray;
            border-radius: 5px;

            padding: 10px;

            p {
                margin: 0px;

                font-size: 12pt;
            }
        }
    }
`

export default function AdminManagementForm() {
    const [ queryType, setQueryType ] = useState('create')
    const [ selectedAdminId, setSelectedAdminId ] = useState()
    const [ formDisabled, setFormDisabled ] = useState()
    const [ queryResponse, setQueryResponse ] = useState()

    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    const { error: adminsError, data: adminsData } = useQuery({
        queryKey: ['adminsQuery', queryResponse],
        queryFn: async () => {
            const queryURL = `http://${serverAddress}/api/admins`
            const res = await fetch(queryURL)
            const resJSON = await res.json()

            return resJSON
        },
        refetchOnMount: 'always'
    })

    async function handleSubmit(event) {
        event.preventDefault()
        setFormDisabled(true)

        if (queryType === 'create') {
            const credentials = {
                username: event.target.newAdminUsername.value,
                password: event.target.newAdminPassword.value
            }
            event.target.reset()

            const queryURL = `http://${serverAddress}/api/admins`
            axios.post(queryURL, credentials).then((res) => {
                setFormDisabled(false)
                setQueryResponse({ status: res.status, data: res.data })
            }).catch((err) => {
                setFormDisabled(false)
                setQueryResponse({ status: err.response?.status, error: err.response?.data?.error ?? err.message })
            })
        } else if (queryType === 'delete') {
            const queryURL = `http://${serverAddress}/api/admins/${selectedAdminId}`
            setSelectedAdminId(undefined)

            axios.delete(queryURL).then((res) => {
                setFormDisabled(false)
                setQueryResponse({ status: res.status, data: res.data })
            }).catch((err) => {
                setFormDisabled(false)
                setQueryResponse({ status: err.response?.status, error: err.response?.data?.error ?? err.message })
            })
        }
    }

    return (
        <AdminManagementFormContainer>
            <h2>Admin Account Management</h2>
            <div id='adminsQueryPanel'>
                <form onSubmit={ handleSubmit }>
                    <fieldset disabled={formDisabled}>
                        <div>
                            <label>Operation:</label>
                            <select id='adminsQueryType' value={queryType} onChange={(event) => {
                                setQueryType(event.target.value)
                                setQueryResponse(undefined)
                            }}>
                                <option value='create' selected>Create a new admin account</option>
                                <option value='delete'>Delete an existing admin account</option>
                            </select>
                        </div>
                        { queryType === 'create' &&
                            <>
                                <div>
                                    <label for='newAdminUsername'>New Username:</label>
                                    <input type='text' id='newAdminUsername' />
                                </div>
                                <div>
                                    <label for='newAdminPassword'>New Password:</label>
                                    <input
                                        type='password'
                                        minLength='8'
                                        maxLength='64'
                                        id='newAdminPassword'
                                    />
                                </div>
                            </>
                        }
                        { queryType === 'delete' &&
                            <select id='adminIdToDelete' onChange={(event) => setSelectedAdminId(event.target.value)} required>
                                <option value='' disabled selected={!selectedAdminId}>Select an admin...</option>
                                {adminsData && adminsData.admins.map((admin) => (
                                    <option value={admin._id} key={admin._id} selected={admin._id === selectedAdminId}>{admin.username}</option>
                                ))}
                            </select>
                        }
                        <input type='submit' value='Submit' />
                    </fieldset>
                </form>
                { queryResponse &&
                    <div id='adminsQueryResults'>
                        { queryResponse.status === 201 && queryType === 'create' &&
                            <p>Admin '{queryResponse.data.username}' created successfully</p>
                        }
                        { queryResponse.status === 200 && queryType === 'delete' &&
                            <p>Admin '{queryResponse.data.deletedUsername}' deleted successfully</p>
                        }
                        { queryResponse.error &&
                            <p>Error: {queryResponse.error}</p>
                        }
                    </div>
                }
            </div>
        </AdminManagementFormContainer>
    )
}