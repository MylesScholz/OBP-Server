import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import 'dotenv/config'

let _client = null

function connectToS3() {
    _client = new S3Client({ region: 'us-west-2', credentials: fromNodeProviderChain() })
}

async function getS3Object(bucket, key) {
    if (!_client) {
        console.error('S3 client does not exist')
        return
    }

    try {
        const input = {
            Bucket: bucket,
            Key: key
        }
        const command = new GetObjectCommand(input)
        const { Body } = await _client.send(command)
        
        return Body
    } catch (err) {
        if (err.Code === 'NoSuchKey') {
            console.error('NoSuchKey:', err.Key)
        } else {
            console.error(err)
        }
    }
}

export { connectToS3, getS3Object }