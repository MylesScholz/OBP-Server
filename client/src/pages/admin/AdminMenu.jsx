import styled from '@emotion/styled'

const AdminMenuContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    border: 1px solid #222;
    border-radius: 5px;

    padding: 15px;

    h2 {
        margin: 0px;

        font-size: 16pt;
    }

    .toolList {
        display: flex;
        flex-direction: column;
        align-items: start;
        gap: 10px;

        margin: 0px;
        margin-bottom: 10px;

        padding: 0px;
        padding-left: 10px;

        button {
            border: 0px;

            padding: 0px;

            font-size: 14pt;

            background-color: transparent;

            cursor: pointer;

            &:hover {
                text-decoration: underline;
                color: #444;
            }
        }

        .selectedTool {
            text-decoration: underline;
        }
    }
`

export default function AdminMenu({ selectedTool, setSelectedTool }) {
    return (
        <AdminMenuContainer>
            <h2>Administrator Tools</h2>

            <div className='toolList'>
                <button
                    className={ selectedTool === 'login' ? 'selectedTool' : '' }
                    onClick={() => setSelectedTool('login')}
                >API Logins</button>
                <button
                    className={ selectedTool === 'accounts' ? 'selectedTool' : '' }
                    onClick={() => setSelectedTool('accounts')}
                >Accounts</button>
            </div>
        </AdminMenuContainer>
    )
}