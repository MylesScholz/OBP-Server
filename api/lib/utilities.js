import fs from 'fs'
import path from 'path'

/*
 * clearDirectory()
 * Deletes all files in a given directory, but not the directory itself (non-recursive)
 */
function clearDirectory(directory) {
    try {
        // Read the list of files in the given directory
        let files = fs.readdirSync(directory)

        // 'rm' each file
        for (const file of files) {
            fs.rmSync(path.join(directory, file))
        }
    } catch (error) {
        console.log('Error while clearing directory:', error)
    }
}

/*
 * limitFilesInDirectory()
 * Limits the number of files in a given directory to a given number; deletes the least recently edited file if over the limit
 */
function limitFilesInDirectory(directory, maxFiles) {
    try {
        // Read the list of files in the given directory
        let files = fs.readdirSync(directory)

        // Delete the least recently edited file while over the limit
        while (files.length > maxFiles) {
            // Use 'stat' to find when the file was last edited
            // Filter to only files (not directories)
            // And find the least recently edited file
            const oldestFile = files
                .map((f) => [path.join(directory, f), fs.statSync(path.join(directory, f))])
                .filter((f) => f[1].isFile())
                .reduce((oldest, current) => current[1].mtimeMs < oldest[1].mtimeMs ? current : oldest)
            
            // 'rm' the least recently edited file
            fs.rmSync(oldestFile[0])
            // Reread the list of files in the directory
            files = fs.readdirSync(directory)
        }
    } catch (error) {
        console.log('Error while limiting files in directory:', error)
    }
}

export { clearDirectory, limitFilesInDirectory }