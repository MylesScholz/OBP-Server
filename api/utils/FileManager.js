import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import { parse as parseAsync } from 'csv-parse'
import { parse as parseSync } from 'csv-parse/sync'
import { stringify as stringifyAsync } from 'csv-stringify'
import { stringify as stringifySync } from 'csv-stringify/sync'

class FileManager {
    constructor() {}

    /*
     * writeJSON()
     * Writes data to a given JSON file path
     */
    writeJSON(filePath, data) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(data || {}))
            return true
        } catch (error) {
            console.error(`Error while attempting to write to '${filePath}':`, error)
            return false
        }
    }

    /*
     * writeCSV()
     * Writes CSV data to a given file path (with a given header)
     */
    writeCSV(filePath, data, header) {
        try {
            const csv = stringifySync(data, { header: true, columns: header })
            fs.writeFileSync(filePath, csv)
            return true
        } catch (error) {
            console.error(`Error while attempting to write to '${filePath}':`, error)
            return false
        }
    }

    /*
     * writeCSVFromDatabase()
     * Writes a CSV page-by-page from a database table using a given page query function
     */
    async writeCSVFromDatabase(filePath, header, getPage) {
        if (!filePath || !getPage) return
        
        try {
            // Create an output stringifier
            const outputFileStream = fs.createWriteStream(filePath, { encoding: 'utf-8' })
            const stringifier = stringifyAsync({ header: true, columns: header })
            stringifier.pipe(outputFileStream)
        
            // Create a function that guarantees write completion before continuing
            const writeAsync = (stringifier, data) => new Promise((resolve, reject) => {
                stringifier.write(data, (error) => {
                    if (error) reject(error)
                    else resolve()
                })
            })
        
            let pageNumber = 1
            let results = await getPage(pageNumber)

            // Write just the header if there are no documents provided
            if (results.pagination.totalDocuments === 0) {
                return this.writeCSV(filePath, [], header)
            }

            while (pageNumber <= results.pagination.totalPages) {
                for (const document of results.data) {
                    await writeAsync(stringifier, document)
                }
        
                // Query the next page
                results = await getPage(++pageNumber)
            }

            return true
        } catch (error) {
            console.error(`Error while attempting to write to '${filePath}' from database:`, error)
            return false
        }
    }

    /*
     * readJSON()
     * Reads data from a given JSON file path; creates a default file if absent and default data is provided
     */
    readJSON(filePath, defaultData) {
        // Create a default file if provided file path does not exist and default data is provided
        if (!fs.existsSync(filePath) && defaultData) {
            this.writeJSON(filePath, defaultData)
        }

        // Read and parse the JSON file
        try {
            const data = fs.readFileSync(filePath)
            return JSON.parse(data)
        } catch (error) {
            console.error(`Error while attempting to read and parse '${filePath}':`, error)
        }
    }

    /*
     * readCSV()
     * Reads and parses CSV data from a given file path; creates a default file if absent and default data is provided
     */
    readCSV(filePath, defaultData, defaultHeader) {
        // Create a default file if provided file path does not exist and default data is provided
        if (!fs.existsSync(filePath) && defaultData) {
            this.writeCSV(filePath, defaultData, defaultHeader)
        }

        try {
            const data = fs.readFileSync(filePath)
            return parseSync(data, { columns: true, skip_empty_lines: true, relax_quotes: true, trim: true })
        } catch (error) {
            console.error(`Error while attempting to read and parse '${filePath}':`, error)
        }
    }

    /*
     * readCSVChunks()
     * A generator function that reads a given CSV file into memory in chunks of a given size
     */
    async *readCSVChunks(filePath, chunkSize) {
        // Check that the input file path exists
        if (!fs.existsSync(filePath)) {
            throw new Error(`File does not exist: ${filePath}`)
        }

        // Create the read stream and pipe it to a CSV parser
        const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' })
        const parser = parseAsync({ columns: true, skip_empty_lines: true, relax_quotes: true, trim: true })
        const csvStream = fileStream.pipe(parser)

        // Create a chunk to store rows
        let chunk = []

        // Read the file, yielding chunks as they are filled
        for await (const row of csvStream) {
            // Add the current row to the chunk
            chunk.push(row)

            // If the chunk is large enough, yield it and reset the chunk for the next call
            if (chunk.length >= chunkSize) {
                yield chunk
                chunk = []
            }
        }

        // Yield any remaining rows (a partial chunk)
        if (chunk.length > 0) {
            yield chunk
        }
    }

    /*
     * compressFile()
     * Compresses a given file to a zip file
     */
    compressFile(filePath) {
        // Check that the input file path exists
        if (!fs.existsSync(filePath)) {
            throw new Error(`File does not exist: ${filePath}`)
        }

        const zipName = filePath.replace(/\.[a-zA-Z]+\b/, '.zip')
        const zip = new AdmZip()
    
        zip.addLocalFile(filePath)
        zip.writeZip(zipName)
    }

    /*
     * limitFilesInDirectory()
     * Limits the number of files in a given directory; compresses the least recently edited file if over the limit
     */
    limitFilesInDirectory(directory, maxFiles) {
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
                this.compressFile(oldestFile.path)
                fs.rmSync(oldestFile.path)
                // Reread the list of files in the directory
                files = fs.readdirSync(directory).filter((f) => !f.toLowerCase().endsWith('.zip'))
            }
        } catch (error) {
            console.error('Error while limiting files in directory:', error)
        }
    }

    /*
     * clearDirectory()
     * Deletes all files in a given directory, but not the directory itself (non-recursive)
     */
    clearDirectory(directory) {
        try {
            // Read the list of files in the given directory
            let files = fs.readdirSync(directory)
    
            // 'rm' each file
            for (const file of files) {
                fs.rmSync(path.join(directory, file))
            }
        } catch (error) {
            console.error('Error while clearing directory:', error)
        }
    }
}

export default new FileManager()