import { fromFile } from 'geotiff'

class ElevationService {
    /*
     * getElevationFileName()
     * Takes a coordinate pair as strings and generates the GeoTIFF file name where its elevation data is stored
     */
    getElevationFileName(latitude, longitude) {
        // Check that both latitude and longitude are provided and are parseable as floats
        if (!latitude || !longitude || !parseFloat(latitude) || !parseFloat(longitude)) {
            return ''
        }

        // Split just the integer part of the latitude and longitude
        let cardinalLatitude = latitude.split('.')[0]
        const degreesLatitude = parseInt(cardinalLatitude)
        let cardinalLongitude = longitude.split('.')[0]
        const degreesLongitude = parseInt(cardinalLongitude)

        // Convert negative latitudes to degrees south
        if (degreesLatitude < 0) {
            cardinalLatitude = 's' + `${-degreesLatitude + 1}`
        } else {
            cardinalLatitude = 'n' + cardinalLatitude
        }

        // Convert negative longitudes to degrees west
        if (degreesLongitude < 0) {
            cardinalLongitude = 'w' + `${-degreesLongitude + 1}`.padStart(3, '0')
        } else {
            cardinalLongitude = 'e' + cardinalLongitude.padStart(3, '0')
        }

        // Create the file name for the elevation data file in which the coordinates lie
        const fileName = `elevation/${cardinalLatitude}_${cardinalLongitude}_1arc_v3.tif`

        return fileName
    }

    /*
     * readElevationFromFile()
     * Searches for the elevation value of a given coordinate in a given GeoTIFF file
     */
    async readElevationFromFile(fileKey, latitude, longitude) {
        try {
            // Local path for the elevation file
            const filePath = './shared/data/' + fileKey

            // Read the given file's raster data using the geotiff package
            const tiff = await fromFile(filePath)
            const image = await tiff.getImage()
            const rasters = await image.readRasters()
            const data = rasters[0]

            // Calculate the row and column corresponding to the given coordinate
            const latitudeDecimalPart = latitude - Math.floor(latitude)
            const row = rasters.height - Math.floor(latitudeDecimalPart * rasters.height) - 1

            const longitudeDecimalPart = longitude - Math.floor(longitude)
            const column = Math.floor(longitudeDecimalPart * rasters.width)

            // Look up the elevation value for the row and column, default to an empty string
            const elevation = data[column + rasters.width * row] ?? -Infinity
            if (elevation < -10) {
                elevation = ''
            } else {
                elevation = elevation.toString()
            }

            // Close the GeoTIFF file
            tiff.close()

            return elevation
        } catch (err) {
            // Default to an empty string if the file reading fails (e.g., the file doesn't exist)
            return ''
        }
    }

    /*
     * readElevationBatchFromFile()
     * Given a batch of coordinates corresponding to a single GeoTIFF file, reads the elevation data for each coordinate
     */
    async readElevationBatchFromFile(fileName, batch) {
        try {
            // Create the output object, which relates specific coordinates (as comma-joined strings) to their corresponding elevation
            const elevations = {}

            // Local path for the elevation file
            const filePath = './shared/data/' + fileName

            // Read the given file's raster data using the geotiff package
            const tiff = await fromFile(filePath)
            const image = await tiff.getImage()
            const rasters = await image.readRasters()
            const data = rasters[0]

            for (const coordinate of batch) {
                const latitude = coordinate[0]
                const longitude = coordinate[1]

                // Calculate the row and column corresponding to the current coordinate
                const latitudeDecimalPart = latitude - Math.floor(latitude)
                const row = rasters.height - Math.floor(latitudeDecimalPart * rasters.height) - 1

                const longitudeDecimalPart = longitude - Math.floor(longitude)
                const column = Math.floor(longitudeDecimalPart * rasters.width)

                // Look up the elevation value for the row and column, default to an empty string
                let elevation = data[column + rasters.width * row] ?? -Infinity
                if (elevation < -10) {
                    elevation = ''
                } else {
                    elevation = elevation.toString()
                }

                const joinedCoordinate = `${latitude.toFixed(4)},${longitude.toFixed(4)}`
                elevations[joinedCoordinate] = elevation
            }

            // Close the GeoTIFF file
            tiff.close()

            // Return the elevations object
            return elevations
        } catch (error) {
            // console.error(`Error while attempting to read '${fileName}':`, error)
            // Return nothing if the file reading fails (e.g., the file doesn't exist)
            return
        }
    }

    /*
     * getElevation()
     * Looks up the elevation for a given coordinate using NASA's SRTM 1 Arc-Second Global dataset stored in GeoTIFF files
     */
    async getElevation(latitude, longitude) {
        // Create the file name for the elevation data file in which the coordinates lie
        const fileKey = this.getElevationFileName(latitude, longitude)
    
        // Get the elevation at the precise coordinate from the elevation data file
        return await this.readElevationFromFile(fileKey, parseFloat(latitude), parseFloat(longitude))
    }

    /*
     * getElevations()
     * Batches together a list of coordinates and reads their elevation data from the NASA SRTM 1 Arc-Second Global dataset stored in GeoTIFF files
     */
    async getElevations(coordinates, updateProgress) {
        if (!coordinates) { return }
        await updateProgress(0)
    
        // An object whose keys are elevation data file names and whose values are lists of corresponding coordinates (latitude-longitude float pairs)
        const batches = {}
        for (let i = 0; i < coordinates.length; i++) {
            const [latitude, longitude] = coordinates[i].split(',')
            const fileName = this.getElevationFileName(latitude, longitude)
    
            const coordinate = [parseFloat(latitude), parseFloat(longitude)]
            if (!(fileName in batches)) {
                batches[fileName] = [coordinate]
            } else {
                batches[fileName].push(coordinate)
            }
        }
    
        // Read the files batch-by-batch and append the data to an output object that relates coordinates to their elevation
        let elevations = {}
        let totalBatches = Object.keys(batches).length
        let i = 0
        for (const [fileName, batch] of Object.entries(batches)) {
            const batchElevations = await this.readElevationBatchFromFile(fileName, batch)
    
            if (!!batchElevations) {
                // Append the batch elevations to the overall output object
                elevations = { ...elevations, ...batchElevations }
            }
            
            await updateProgress(100 * (++i) / totalBatches)
        }
    
        return elevations
    }
}

export default new ElevationService()