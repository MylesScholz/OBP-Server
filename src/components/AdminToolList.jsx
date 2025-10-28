import styled from '@emotion/styled'

const AdminToolListContainer = styled.dix`
    display: flex;
    flex-direction: column;

    border: 1px solid gray;
    border-radius: 5px;

    padding: 20px;

    width: 300px;
    height: 300px;

    h2 {
        margin: 0px;
        margin-bottom: 5px;

        font-size: 16pt;
    }

    #adminToolList {
        display: flex;
        flex-direction: column;
        align-items: start;
        gap: 5px;

        margin: 0px;

        padding: 0px;
        padding-left: 10px;

        button {
            border: 0px;

            padding: 0px;

            font-size: 12pt;

            background-color: transparent;

            cursor: pointer;

            &:hover {
                text-decoration: underline;
            }
        }

        .selectedAdminTool {
            font-weight: bold;
        }
    }
`

export default function AdminToolList({ selectedTool, setSelectedTool }) {
    return (
        <AdminToolListContainer>
            <h2>Admin Tools</h2>
            <div id='adminToolList'>
                <button
                    className={ selectedTool === 'plantList' ? 'selectedAdminTool' : '' }
                    onClick={(e) => setSelectedTool('plantList')}
                >Plant List Access</button>
                <button
                    className={ selectedTool === 'determinations' ? 'selectedAdminTool' : '' }
                    onClick={(e) => setSelectedTool('determinations')}
                >Determinations Dataset Access</button>
                <button
                    className={ selectedTool === 'usernames' ? 'selectedAdminTool' : '' }
                    onClick={(e) => setSelectedTool('usernames')}
                >Usernames Dataset Access</button>
                <button
                    className={ selectedTool === 'archive' ? 'selectedAdminTool' : '' }
                    onClick={(e) => setSelectedTool('archive')}
                >Archive Browser</button>
                <button
                    className={ selectedTool === 'accountManager' ? 'selectedAdminTool' : '' }
                    onClick={(e) => setSelectedTool('accountManager')}
                >Admin Account Manager</button>
            </div>
        </AdminToolListContainer>
    )
}