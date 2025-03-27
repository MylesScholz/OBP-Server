import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'

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
 * compressFile()
 * Compresses a given file to a zip file
 */
function compressFile(filePath) {
    const zipName = filePath.replace(/\.[a-zA-Z]+\b/, '.zip')
    const zip = new AdmZip()

    zip.addLocalFile(filePath)
    zip.writeZip(zipName)
}

/*
 * limitFilesInDirectory()
 * Limits the number of files in a given directory to a given number; deletes the least recently edited file if over the limit
 */
function limitFilesInDirectory(directory, maxFiles) {
    try {
        // Read the list of files in the given directory
        let files = fs.readdirSync(directory).filter((f) => !f.toLowerCase().endsWith('.zip'))

        // Delete the least recently edited file while over the limit
        while (files.length > maxFiles) {
            // Use 'stat' to find when the file was last edited
            // Filter to only files (not directories)
            // And find the least recently edited file
            const oldestFile = files
                .map((f) => ({ name: f, path: path.join(directory, f), stat: fs.statSync(path.join(directory, f)) }))
                .filter((f) => f.stat.isFile())
                .reduce((oldest, current) => current.stat.mtimeMs < oldest.stat.mtimeMs ? current : oldest)
            
            // Archive and then 'rm' the least recently edited file
            compressFile(oldestFile.path)
            fs.rmSync(oldestFile.path)
            // Reread the list of files in the directory
            files = fs.readdirSync(directory).filter((f) => !f.toLowerCase().endsWith('.zip'))
        }
    } catch (error) {
        console.log('Error while limiting files in directory:', error)
    }
}

export { clearDirectory, limitFilesInDirectory }