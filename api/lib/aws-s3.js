import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import 'dotenv/config'

// Persistent S3Client
let _client = null

/*
 * connectToS3()
 * Creates an S3Client connected to the account specified in the credential provider chain
 */
function connectToS3() {
    _client = new S3Client({ region: 'us-west-2', credentials: fromNodeProviderChain() })
}

/*
 * getS3Object()
 * Queries an object on the given S3 bucket by the given key
 */
async function getS3Object(bucket, key) {
    // Check that the client exists first
    if (!_client) {
        console.error('S3 client does not exist')
        return
    }

    // Attempt to create and send a GetObjectCommand with the given query parameters
    try {
        const input = {
            Bucket: bucket,
            Key: key
        }
        const command = new GetObjectCommand(input)
        const { Body } = await _client.send(command)
        
        return Body
    } catch (err) {
        // Catch, but don't rethrow, NoSuchKey errors
        if (err.Code === 'NoSuchKey') {
            console.error('NoSuchKey:', err.Key)
        } else {
            console.error(err)
        }
    }
}

export { connectToS3, getS3Object }