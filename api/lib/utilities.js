import fs from 'fs'
import path from 'path'

export function clearDirectory(directory) {
    let files = fs.readdirSync(directory)
    for (const file of files) {
        try {
            fs.rmSync(path.join(directory, file))
        } catch (error) {
            console.log('Error while clearing directory:', error)
        }
    }
}

export function limitFilesInDirectory(directory, maxFiles) {
    let files = fs.readdirSync(directory)
    while (files.length > maxFiles) {
        const oldestFile = files
            .map((f) => [path.join(directory, f), fs.statSync(path.join(directory, f))])
            .filter((f) => f[1].isFile())
            .reduce((oldest, current) => current[1].mtimeMs < oldest[1].mtimeMs ? current : oldest)
        
        fs.rmSync(oldestFile[0])
        files = fs.readdirSync(directory)
    }
}