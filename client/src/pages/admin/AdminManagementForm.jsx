import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import styled from '@emotion/styled'

import { useAuth } from '../../AuthProvider'

const AdminManagementFormContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: 10px;

    border: 1px solid #222;
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
                    justify-content: stretch;
                    align-items: center;
                    gap: 10px;

                    white-space: nowrap;

                    select {
                        flex-grow: 1;

                        border: 1px solid gray;
                        border-radius: 5px;

                        background-color: white;

                        &:hover {
                            background-color: #efefef;
                        }
                    }

                    input {
                        flex-grow: 1;

                        border: 1px solid gray;
                        border-radius: 5px;

                        padding: 3px;
                    }
                }

                input[type='submit'] {
                    border: 1px solid gray;
                    border-radius: 5px;

                    background-color: white;

                    &:hover {
                        background-color: #efefef;
                    }
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
    const { admin } = useAuth()

    const { error: adminsError, data: adminsData } = useQuery({
        queryKey: ['adminsQuery', queryResponse],
        queryFn: async () => {
            const response = await fetch('/api/admins')
            const parsedResponse = await response.json()

            return parsedResponse
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

            axios.post('/api/admins', credentials).then((res) => {
                setFormDisabled(false)
                setQueryResponse({ status: res.status, data: res.data })
            }).catch((err) => {
                setFormDisabled(false)
                setQueryResponse({ status: err.response?.status, error: err.response?.data?.error ?? err.message })
            })
        } else if (queryType === 'delete') {
            const queryUrl = `/api/admins/${selectedAdminId}`
            setSelectedAdminId(undefined)

            axios.delete(queryUrl).then((res) => {
                setFormDisabled(false)
                setQueryResponse({ status: res.status, data: res.data })
            }).catch((error) => {
                setFormDisabled(false)
                setQueryResponse({ status: error.response?.status, error: error.response?.data?.error ?? error.message })
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
                                    <label htmlFor='newAdminUsername'>New Username:</label>
                                    <input type='text' id='newAdminUsername' autoComplete='off' />
                                </div>
                                <div>
                                    <label htmlFor='newAdminPassword'>New Password:</label>
                                    <input
                                        type='password'
                                        minLength='8'
                                        maxLength='64'
                                        id='newAdminPassword'
                                        autoComplete='new-password'
                                    />
                                </div>
                            </>
                        }
                        { queryType === 'delete' &&
                            <div>
                                <select id='adminIdToDelete' onChange={(event) => setSelectedAdminId(event.target.value)} required>
                                    <option value='' disabled selected={!selectedAdminId}>Select an admin account to delete...</option>
                                    { adminsData?.admins?.filter((a) => a.username !== admin).map((a) => (
                                        <option value={a._id} key={a._id} selected={a._id === selectedAdminId}>{a.username}</option>
                                    ))}
                                </select>
                            </div>
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