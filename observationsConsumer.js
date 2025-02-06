import Crypto from 'node:crypto'
import fs from 'fs'
import path from 'path'
import amqp from 'amqplib'
import { fromFile } from 'geotiff'
import { parse } from 'csv-parse'
import { stringify } from 'csv-stringify'
import { stringify as stringifySync } from 'csv-stringify/sync'
import 'dotenv/config'

import { connectToDb } from './api/lib/mongo.js'
import { observationsQueueName } from './api/lib/rabbitmq.js'
import { clearTasksWithoutFiles, getTaskById, updateTaskFailure, updateTaskInProgress, updateTaskResult } from './api/models/task.js'
import { clearDirectory, limitFilesInDirectory } from './api/lib/utilities.js'

/* Constants */

// RabbitMQ connection URL
const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost'
const rabbitmqURL = `amqp://${rabbitmqHost}`
// Maximum number of output files stored on the server
const MAX_OBSERVATIONS = 10
// Maximum number of observations to read from a file at once
const CHUNK_SIZE = 5000
// Number of temporary files to merge together at once
const BATCH_SIZE = 2
// Field names
const ERROR_FLAGS = 'errorFlags'
const OBSERVATION_NO = 'fieldNumber'
const OCCURRENCE_ID = 'occurrenceID'
const INATURALIST_ID = 'userId'
const INATURALIST_ALIAS = 'userLogin'
const FIRST_NAME = 'firstName'
const FIRST_NAME_INITIAL = 'firstNameInitial'
const LAST_NAME = 'lastName'
const RECORDED_BY = 'recordedBy'
const SAMPLE_ID = 'sampleId'
const SPECIMEN_ID = 'specimenId'
const DAY = 'day'
const MONTH = 'month'
const YEAR = 'year'
const DAY2 = 'day2'
const MONTH2 = 'month2'
const YEAR2 = 'year2'
const START_DAY_OF_YEAR = 'startDayofYear'
const END_DAY_OF_YEAR = 'endDayofYear'
const VERBATIM_DATE = 'verbatimEventDate'
const COUNTRY = 'country'
const STATE = 'stateProvince'
const COUNTY = 'county'
const LOCALITY = 'locality'
const ELEVATION = 'verbatimElevation'
const LATITUDE = 'decimalLatitude'
const LONGITUDE = 'decimalLongitude'
const ACCURACY = 'coordinateUncertaintyInMeters'
const SAMPLING_PROTOCOL = 'samplingProtocol'
const RESOURCE_RELATIONSHIP = 'relationshipOfResource'
const RESOURCE_ID = 'resourceID'
const RELATED_RESOURCE_ID = 'relatedResourceID'
const PLANT_PHYLUM = 'phylumPlant'
const PLANT_ORDER = 'orderPlant'
const PLANT_FAMILY = 'familyPlant'
const PLANT_GENUS = 'genusPlant'
const PLANT_SPECIES = 'speciesPlant'
const PLANT_TAXON_RANK = 'taxonRankPlant'
const INATURALIST_URL = 'url'

// Template object for observations; static values are provided as strings, data-dependent values are set to null
const observationTemplate = {
    'errorFlags': null,
    'dateLabelPrint': '',
    'fieldNumber': null,
    'catalogNumber': '',
    'occurrenceID': null,
    'userId': null,
    'userLogin': null,
    'firstName': null,
    'firstNameInitial': null,
    'lastName': null,
    'recordedBy': null,
    'sampleId': null,
    'specimenId': null,
    'day': null,
    'month': null,
    'year': null,
    'verbatimEventDate': null,
    'day2': '',
    'month2': '',
    'year2': '',
    'startDayofYear': '',
    'endDayofYear': '',
    'country': null,
    'stateProvince': null,
    'county': null,
    'locality': null,
    'verbatimElevation': null,
    'decimalLatitude': null,
    'decimalLongitude': null,
    'coordinateUncertaintyInMeters': null,
    'samplingProtocol': null,
    'resourceRelationship': null,
    'resourceID': null,
    'relatedResourceID': null,
    'relationshipRemarks': '',
    'phylumPlant': null,
    'orderPlant': null,
    'familyPlant': null,
    'genusPlant': null,
    'speciesPlant': null,
    'taxonRankPlant': null,
    'url': null,
    'phylum': '',
    'class': '',
    'order': '',
    'family': '',
    'genus': '',
    'subgenus': '',
    'specificEpithet': '',
    'taxonomicNotes': '',
    'scientificName': '',
    'sex': '',
    'caste': '',
    'taxonRank': '',
    'identifiedBy': '',
    'familyVolDet': '',
    'genusVolDet': '',
    'speciesVolDet': '',
    'sexVolDet': '',
    'casteVolDet': ''
}
// A list of fields that should be flagged if empty
const nonEmptyFields = [
    FIRST_NAME,
    FIRST_NAME_INITIAL,
    LAST_NAME,
    SAMPLE_ID,
    SPECIMEN_ID,
    DAY,
    MONTH,
    YEAR,
    COUNTRY,
    STATE,
    COUNTY,
    LOCALITY,
    ELEVATION,
    LATITUDE,
    LONGITUDE,
    SAMPLING_PROTOCOL
]
// Abbreviations for countries keyed by how iNaturalist refers to them
const countryAbbreviations = {
    'United States': 'USA',
    'Canada': 'CA',
    'CAN': 'CA'
}
// Abbreviations for all states and provinces; not all of these are expected in the actual data
const stateProvinceAbbreviations = {
    'Alabama': 'AL',                    // United States
    'Alaska': 'AK',
    'Arizona': 'AZ',
    'Arkansas': 'AR',
    'California': 'CA',
    'Colorado': 'CO',
    'Connecticut': 'CT',
    'Delaware': 'DE',
    'Florida': 'FL',
    'Georgia': 'GA',
    'Hawaii': 'HI',
    'Idaho': 'ID',
    'Illinois': 'IL',
    'Indiana': 'IN',
    'Iowa': 'IA',
    'Kansas': 'KS',
    'Kentucky': 'KY',
    'Louisiana': 'LA',
    'Maine': 'ME',
    'Maryland': 'MD',
    'Massachusetts': 'MA',
    'Michigan': 'MI',
    'Minnesota': 'MN',
    'Mississippi': 'MS',
    'Missouri': 'MO',
    'Montana': 'MT',
    'Nebraska': 'NE',
    'Nevada': 'NV',
    'New Hampshire': 'NH',
    'New Jersey': 'NJ',
    'New Mexico': 'NM',
    'New York': 'NY',
    'North Carolina': 'NC',
    'North Dakota': 'ND',
    'Ohio': 'OH',
    'Oklahoma': 'OK',
    'Oregon': 'OR',
    'Pennsylvania': 'PA',
    'Rhode Island': 'RI',
    'South Carolina': 'SC',
    'South Dakota': 'SD',
    'Tennessee': 'TN',
    'Texas': 'TX',
    'Utah': 'UT',
    'Vermont': 'VT',
    'Virginia': 'VA',
    'Washington': 'WA',
    'West Virginia': 'WV',
    'Wisconsin': 'WI',
    'Alberta': 'AB',                    // Canadian Provinces
    'British Columbia': 'BC',
    'Manitoba': 'MB',
    'New Brunswick': 'NB',
    'Newfoundland and Labrador': 'NL',
    'Nova Scotia': 'NS',
    'Ontario': 'ON',
    'Prince Edward Island': 'PE',
    'Quebec': 'QC',
    'Saskatchewan': 'SK',
    'Northwest Territories': 'NT',      // Canadian Territories
    'Nunavut': 'NU',
    'Yukon': 'YT'
}
// A RegExp for 'County' or 'Co' or 'Co.'
const countyRegex = new RegExp(/(?<![^,.\s])Co(?:unty)?\.?(?![^,.\s])+/ig)
// A list of RegExps to detect street suffixes in the OBA_LOCATION, OBA_ABBR_LOCATION, and DARWIN_LOCATION fields
const streetSuffixRegexes = [
    'R(?:oa)?d',                    // Road, Rd
    'St(?:r(?:eet)?)?',             // Street, Str, St
    'Av(?:e(?:nue)?)?',             // Avenue, Ave, Av
    'Dr(?:ive)?',                   // Drive, Dr
    'Blvd|Boulevard',               // Boulevard, Blvd
    'C(?:our)?t',                   // Court, Ct
    'Ln|Lane'                       // Lane, Ln
].map((regex) => new RegExp(`(?<![^,.\\s])${regex}(?![^,.\\s])`, 'i'))

/*
 * fetchObservations()
 * Makes an API request to iNaturalist.org for a single page of observations from a given source project over a given period
 */
async function fetchObservations(sourceId, minDate, maxDate, page) {
    const requestURL = `https://api.inaturalist.org/v1/observations?project_id=${sourceId}&d1=${minDate}&d2=${maxDate}&per_page=200&page=${page}`

    try {
        const res = await fetch(requestURL)
        if (res.ok) {
            return await res.json()
        } else {
            console.error(`Bad response while fetching '${requestURL}':`, res)
        }
    } catch (err) {
        console.error(`ERROR while fetching '${requestURL}':`, err)
    }
}

/*
 * pullSourceObservations()
 * Pulls observations from iNaturalist.org page-by-page for a given source project over a given period
 */
async function pullSourceObservations(sourceId, minDate, maxDate, updatePullSourceProgress) {
    let response = await fetchObservations(sourceId, minDate, maxDate, 1)
    let results = response?.results ?? []

    const totalResults = parseInt(response?.total_results ?? '0')
    let totalPages = Math.floor(totalResults / 200) + 1

    updatePullSourceProgress(100 / totalPages)

    for (let i = 2; i < totalPages + 1; i++) {
        response = await fetchObservations(sourceId, minDate, maxDate, i)
        results = results.concat(response?.results ?? [])
        updatePullSourceProgress(100 * (i - 1) / totalPages)
    }

    return results
}

/*
 * pullObservations()
 * Pulls all observations specified in a given task
 */
async function pullObservations(task, updatePullProgress) {
    let observations = []

    let i = 0
    for (const sourceId of task.sources) {
        const sourceObservations = await pullSourceObservations(sourceId, task.minDate, task.maxDate, async (percentage) => {
            updatePullProgress(`${((100 * i + percentage) / task.sources.length).toFixed(2)}%`)
        })
        observations = observations.concat(sourceObservations)
        i++
    }

    return observations
}

/*
 * readPlacesFile()
 * Parses /api/data/places.json into a JS object
 */
function readPlacesFile() {
    // If /api/data/places.json doesn't exist locally, create a base version and save it
    if (!fs.existsSync('./api/data/places.json')) {
        fs.writeFileSync('./api/data/places.json', '{}')
    }

    // Read and parse /api/data/places.json
    const placesData = fs.readFileSync('./api/data/places.json')
    return JSON.parse(placesData || '{}')
}

/*
 * fetchPlaces()
 * Makes API requests to iNaturalist.org to collect place data from a given list of place IDs
 */
async function fetchPlaces(places) {
    // places can be a very long list of IDs, so batch requests to avoid iNaturalist API refusal
    const partitionSize = 50
    const nPartitions = Math.floor(places.length / partitionSize) + 1
    let partitionStart = 0
    let partitionEnd = Math.min(partitionSize, places.length)

    // Fetch place data for each batch from iNaturalist.org and append it together
    let results = []
    for (let i = 0; i < nPartitions; i++) {
        const requestURL = `https://api.inaturalist.org/v1/places/${places.slice(partitionStart, partitionEnd).join(',')}`

        try {
            const res = await fetch(requestURL)
            if (res.ok) {
                const resJSON = await res.json()
                results = results.concat(resJSON['results'])
            } else {
                console.error(`Bad response while fetching '${requestURL}':`, res)
            }
        } catch (err) {
            console.error(`ERROR while fetching ${requestURL}:`, err)
        }

        partitionStart = partitionEnd
        partitionEnd = Math.min(partitionEnd + partitionSize, places.length)
    }

    return results
}

/*
 * writePlacesFile()
 * Writes a given places object into /api/data/places.json
 */
function writePlacesFile(places) {
    fs.writeFileSync('./api/data/places.json', JSON.stringify(places))
}

/*
 * updatePlaces()
 * Updates local place data (stored in /api/data/places.json) for each given observation
 */
async function updatePlaces(observations) {
    // Get the current place data
    const places = readPlacesFile()

    // Compile a list of unknown places from the given observations
    const unknownPlaces = []
    for (const observation of observations) {
        const placeIds = observation['place_ids']
        
        for (const placeId of placeIds) {
            if (!(placeId in places) && !unknownPlaces.includes(placeId)) {
                unknownPlaces.push(placeId)
            }
        }
    }

    // Fetch data for each unknown place from iNaturalist.org and combine it with the existing data
    if (unknownPlaces.length > 0) {
        const newPlaces = await fetchPlaces(unknownPlaces)
        for (const newPlace of newPlaces) {
            if (
                newPlace['admin_level'] === 0 ||
                newPlace['admin_level'] === 10 ||
                newPlace['admin_level'] === 20
            ) {
                places[newPlace['id']] = [
                    newPlace['admin_level'].toString(),
                    newPlace['name']
                ]
            }
        }
    }

    // Store the updated place data
    writePlacesFile(places)
}

/*
 * readTaxaFile()
 * Parses /api/data/taxa.json into a JS object
 */
function readTaxaFile() {
    // If /api/data/taxa.json doesn't exist locally, create a base version and save it
    if (!fs.existsSync('./api/data/taxa.json')) {
        fs.writeFileSync('./api/data/taxa.json', '{}')
    }

    // Read and parse /api/data/taxa.json
    const placesData = fs.readFileSync('./api/data/taxa.json')
    return JSON.parse(placesData || '{}')
}

/*
 * delay()
 * Returns a Promise that resolves after a given number of milliseconds
 */
function delay(mSec) {
    return new Promise(resolve => setTimeout(resolve, mSec))
}

/*
 * fetchTaxa()
 * Makes API requests to iNaturalist.org to collect taxon data from a given list of taxon IDs
 */
async function fetchTaxa(taxa) {
    // taxa can be a very long list of IDs, so batch requests to avoid iNaturalist API refusal
    const partitionSize = 30
    const nPartitions = Math.floor(taxa.length / partitionSize) + 1
    let partitionStart = 0
    let partitionEnd = Math.min(partitionSize, taxa.length)

    // Fetch taxon data for each batch from iNaturalist.org and append it together
    let results = []
    for (let i = 0; i < nPartitions; i++) {
        const requestURL = `https://api.inaturalist.org/v1/taxa/${taxa.slice(partitionStart, partitionEnd).join(',')}`

        try {
            // Make requests with exponential backoff to avoid API throttling
            for (let i = 1000; i <= 8000; i *= 2) {
                const res = await fetch(requestURL)

                if (res.ok) {
                    const resJSON = await res.json()
                    results = results.concat(resJSON['results'])
                    break
                } else if (res.status === 429) {    // 'Too Many Requests'
                    console.log(`Hit API request limit. Waiting ${i} milliseconds...`)
                    await delay(i)
                } else {
                    console.error(`Bad response while fetching '${requestURL}':`, res)
                    break
                }
            }
        } catch (err) {
            console.error(`ERROR while fetching ${requestURL}:`, err)
        }

        partitionStart = partitionEnd
        partitionEnd = Math.min(partitionEnd + partitionSize, taxa.length)
    }

    return results
}

/*
 * writeTaxaFile()
 * Writes a given taxa object into /api/data/taxa.json
 */
function writeTaxaFile(taxa) {
    fs.writeFileSync('./api/data/taxa.json', JSON.stringify(taxa))
}

/*
 * updateTaxa()
 * Updates local taxonomy data (stored in /api/data/taxa.json) for each given observation
 */
async function updateTaxa(observations) {
    // Get current taxonomy data
    const taxa = readTaxaFile()

    // Compile a list of unknown taxa from the given observations
    const unknownTaxa = []
    for (const observation of observations) {
        const ancestors = observation.taxon?.min_species_ancestry?.split(',') ?? []

        for (const taxonId of ancestors) {
            if (!(taxonId in taxa) && !unknownTaxa.includes(taxonId)) {
                unknownTaxa.push(taxonId)
            }
        }
    }

    // Fetch data for each unknown taxon from iNaturalist.org and combine it with the existing data
    if (unknownTaxa.length > 0) {
        const newTaxa = await fetchTaxa(unknownTaxa)

        const savedRanks = ['phylum', 'order', 'family', 'genus', 'species']
        for (const newTaxon of newTaxa) {
            if (savedRanks.includes(newTaxon.rank)) {
                taxa[newTaxon.id] = {
                    rank: newTaxon.rank,
                    name: newTaxon.name
                }
            }
        }
    }

    // Store the updated taxonomy data
    writeTaxaFile(taxa)
}

/*
 * readUsernamesFile()
 * Parses /api/data/usernames.json into a JS object
 */
function readUsernamesFile() {
    // If /api/data/usernames.json doesn't exist locally, create a base version and save it
    if (!fs.existsSync('./api/data/usernames.json')) {
        fs.writeFileSync('./api/data/usernames.json', '{}')
    }
    
    // Read and parse /api/data/usernames.json
    const usernamesData = fs.readFileSync('./api/data/usernames.json')
    return JSON.parse(usernamesData || '{}')
}

/*
 * getUserName()
 * Searches for the first name, first initial, and last name of an iNaturalist user in /api/data/usernames.json
 */
function getUserName(user) {
    // Default to empty strings
    let firstName = '', firstNameInitial = '', lastName = ''

    // Check that the user field exists
    if (!user) {
        return { firstName, firstNameInitial, lastName }
    }

    // Get the known name data
    const usernames = readUsernamesFile()

    // Attempt to extract the user from their iNaturalist alias
    const userAlias = user['login']
    const userName = usernames[userAlias]

    // Format the outputs if the user was found
    if (userName) {
        firstName = userName.firstName
        firstNameInitial = userName.firstNameInitial
        lastName = userName.lastName
    }
    
    return { firstName, firstNameInitial, lastName }
}

/*
 * getPlaces()
 * Searches for country, state/province, and county names in the given place data (originally from /api/data/places.json)
 */
function getPlaces(placeIds, places) {
    // Default to empty strings
    let country = '', stateProvince = '', county = ''

    // Check that placeIds and places exist
    if (!placeIds || !places) {
        return { country, stateProvince, county }
    }

    // Look up each place ID and set the appropriate output string
    for (const placeId of placeIds) {
        const place = places[placeId]

        // Set the country, stateProvince, or county output string based on the 'admin_level' value, assuming the place was found in places.json
        if (place?.at(0) === '0') country = place[1] ?? ''
        if (place?.at(0) === '10') stateProvince = place[1] ?? ''
        if (place?.at(0) === '20') county = place[1] ?? ''
    }

    // Remove 'County' or 'Co' from the county field (case insensitive) before returning all values
    county = county.replace(countyRegex, '')
    return { country, stateProvince, county }
}

/*
 * getPlantAncestry()
 * Searches in the given taxonomy (taxa) for the plant ancestry of the given observation taxon
 */
function getPlantAncestry(taxon, taxa) {
    const plantAncestry = {
        phylum: '',
        order: '',
        family: '',
        genus: '',
        species: ''
    }

    // Check that the given taxon and taxonomy data exist
    if (!taxon || !taxa) {
        return plantAncestry
    }

    // Look up each ancestor in the local taxonomy dataset
    const ancestorIds = taxon.min_species_ancestry?.split(',') ?? []
    for (const ancestorId of ancestorIds) {
        const ancestorTaxon = taxa[ancestorId]
        if (ancestorTaxon) {
            plantAncestry[ancestorTaxon.rank] = ancestorTaxon.name
        }
    }

    // If the given taxon is at least species level, use its name instead of the result of the local data
    const minSpeciesTaxonRanks = ['species', 'hybrid', 'subspecies', 'variety', 'form']
    if (minSpeciesTaxonRanks.includes(taxon.rank)) {
        plantAncestry.species = taxon.name || plantAncestry.species
    }

    // Use the given taxon as a minimum (unless it is empty)
    plantAncestry[taxon.rank] = taxon.name || plantAncestry[taxon.rank]

    return plantAncestry
}

/*
 * getOFV()
 * Looks up the value of an iNaturalist observation field by name
 */
function getOFV(ofvs, fieldName) {
    const ofv = ofvs?.find((field) => field['name'] === fieldName)
    return ofv?.value ?? ''
}

/*
 * includesStreetSuffix()
 * A boolean function that returns whether a given string contains a street suffix (Road, Rd, Street, St, etc.)
 */
function includesStreetSuffix(string) {
    if (!string || typeof string !== 'string') { return false }
    return streetSuffixRegexes.some((regex) => regex.test(string))
}

/*
 * getElevationFileName()
 * Takes a coordinate pair as strings and generates the GeoTIFF file name where its elevation data is stored
 */
function getElevationFileName(latitude, longitude) {
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
async function readElevationFromFile(fileKey, latitude, longitude) {
    try {
        // Local path for the elevation file
        const filePath = './api/data/' + fileKey

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
 * getElevation()
 * Looks up the elevation for a given coordinate using NASA's SRTM 1 Arc-Second Global dataset stored in GeoTIFF files
 */
async function getElevation(latitude, longitude) {
    // Create the file name for the elevation data file in which the coordinates lie
    const fileKey = getElevationFileName(latitude, longitude)

    // Get the elevation at the precise coordinate from the elevation data file
    return await readElevationFromFile(fileKey, parseFloat(latitude), parseFloat(longitude))
}

/*
 * readElevationBatchFromFile()
 * Given a batch of coordinates corresponding to a single GeoTIFF file, reads the elevation data for each coordinate
 */
async function readElevationBatchFromFile(fileName, batch) {
    try {
        // Create the output object, which relates specific coordinates (as comma-joined strings) to their corresponding elevation
        const elevations = {}

        // Local path for the elevation file
        const filePath = './api/data/' + fileName

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
 * getElevations()
 * Batches together a list of coordinates and reads their elevation data from the NASA SRTM 1 Arc-Second Global dataset stored in GeoTIFF files
 */
async function getElevations(coordinates) {
    if (!coordinates) { return }

    // An object whose keys are elevation data file names and whose values are lists of corresponding coordinates (latitude-longitude float pairs)
    const batches = {}
    for (let i = 0; i < coordinates.length; i++) {
        const [latitude, longitude] = coordinates[i].split(',')
        const fileName = getElevationFileName(latitude, longitude)

        const coordinate = [parseFloat(latitude), parseFloat(longitude)]
        if (!(fileName in batches)) {
            batches[fileName] = [coordinate]
        } else {
            batches[fileName].push(coordinate)
        }
    }

    // Read the files batch-by-batch and append the data to an output object that relates coordinates to their elevation
    let elevations = {}
    for (const [fileName, batch] of Object.entries(batches)) {
        const batchElevations = await readElevationBatchFromFile(fileName, batch)

        if (!!batchElevations) {
            // Append the batch elevations to the overall output object
            elevations = { ...elevations, ...batchElevations }
        }
    }

    return elevations
}

/*
 * formatObservation()
 * Creates a fully formatted observation object from a raw iNaturalist observation (and place, elevation, and taxonomy data)
 */
async function formatObservation(observation, places, elevations, taxa) {
    // Start from template observation object
    const formattedObservation = Object.assign({}, observationTemplate)

    // Return empty template if no observation is provided
    if (!observation) {
        // Replace null values from the template with an empty string
        Object.keys(formattedObservation).forEach((key) => !formattedObservation[key] ? formattedObservation[key] = '' : null)

        // Set error flags for fields that should not be empty
        formattedObservation[ERROR_FLAGS] = nonEmptyFields.filter((field) => !formattedObservation[field]).join(';')

        return formattedObservation
    }

    /* Read from external files */

    // Parse user's name
    const { firstName, firstNameInitial, lastName } = getUserName(observation['user'])

    // Parse country, state/province, and county
    const { country, stateProvince, county } =  getPlaces(observation['place_ids'], places)

    /* Formatted fields as constants */

    // Attempt to parse 'observed_on_string' as a JavaScript Date object
    const observedDate = observation['observed_on_string'] ? new Date(observation['observed_on_string']) : undefined

    // Extract the day, month, and year from the Date object
    const observedDay = observedDate?.getDate()
    const observedMonth = observedDate?.getMonth() + 1
    const observedYear = observedDate?.getFullYear()

    // Format the day, month, and year
    const formattedDay = !isNaN(observedDay) ? observedDay.toString() : ''
    const formattedMonth = !isNaN(observedMonth) ? observedMonth.toString() : ''
    const formattedYear = !isNaN(observedYear) ? observedYear.toString() : ''
    
    // Format the location
    const formattedLocation = observation.place_guess?.split(/,\s*/)?.at(0)?.replace(countyRegex, '') ?? ''

    // Format the coordinates
    const formattedLatitude = observation.geojson?.coordinates?.at(1)?.toFixed(4)?.toString() ?? ''
    const formattedLongitude = observation.geojson?.coordinates?.at(0)?.toFixed(4)?.toString() ?? ''

    // A list of fields to flag in addition to the non-empty fields
    let errorFields = []

    /* Final formatting */

    formattedObservation[INATURALIST_ID] = observation.user?.id?.toString() ?? ''
    formattedObservation[INATURALIST_ALIAS] = observation.user?.login ?? ''

    formattedObservation[FIRST_NAME] = firstName
    formattedObservation[FIRST_NAME_INITIAL] = firstNameInitial
    formattedObservation[LAST_NAME] = lastName
    formattedObservation[RECORDED_BY] = `${firstName}${(firstName && lastName) ? ' ' : ''}${lastName}`

    formattedObservation[SAMPLE_ID] = getOFV(observation['ofvs'], 'Sample ID.')
    formattedObservation[SPECIMEN_ID] = getOFV(observation['ofvs'], 'Number of bees collected')

    formattedObservation[DAY] = formattedDay
    formattedObservation[MONTH] = formattedMonth
    formattedObservation[YEAR] = formattedYear
    formattedObservation[VERBATIM_DATE] = `${formattedMonth}/${formattedDay}/${formattedYear}`

    formattedObservation[COUNTRY] = countryAbbreviations[country] ?? country
    formattedObservation[STATE] = stateProvinceAbbreviations[stateProvince] ?? stateProvince
    formattedObservation[COUNTY] = county

    // Flag COUNTRY and STATE if they have an unexpected value
    if (!countryAbbreviations[country]) { errorFields.push(COUNTRY) }
    if (!stateProvinceAbbreviations[stateProvince]) { errorFields.push(STATE) }

    formattedObservation[LOCALITY] = formattedLocation

    // Flag LOCALITY if formattedLocation contains any street suffixes
    if (includesStreetSuffix(formattedLocation)) {
        errorFields.push(LOCALITY)
    }

    const coordinate = `${formattedLatitude},${formattedLongitude}`
    formattedObservation[ELEVATION] = elevations[coordinate] || ''

    formattedObservation[LATITUDE] = formattedLatitude
    formattedObservation[LONGITUDE] = formattedLongitude
    formattedObservation[ACCURACY] = observation.positional_accuracy?.toString() ?? ''

    // Flag ACCURACY if positional_accuracy is greater than 250 meters
    if (observation.positional_accuracy > 250) { errorFields.push(ACCURACY) }

    formattedObservation[SAMPLING_PROTOCOL] = 'aerial net'

    formattedObservation[RESOURCE_RELATIONSHIP] = 'visits flowers of'
    formattedObservation[RELATED_RESOURCE_ID] = observation.uuid

    // Look up the plant ancestry and format it
    const plantAncestry = getPlantAncestry(observation.taxon, taxa)
    formattedObservation[PLANT_PHYLUM] = plantAncestry.phylum
    formattedObservation[PLANT_ORDER] = plantAncestry.order
    formattedObservation[PLANT_FAMILY] = plantAncestry.family
    formattedObservation[PLANT_GENUS] = plantAncestry.genus
    formattedObservation[PLANT_SPECIES] = plantAncestry.species

    // As a fallback, search the plant ancestry upward for the first truthy rank
    const minRank = ['species', 'genus', 'family', 'order', 'phylum'].find((rank) => !!plantAncestry[rank])
    formattedObservation[PLANT_TAXON_RANK] = observation.taxon?.rank || minRank || ''

    // Flag all plant ancestry fields if the phylum is defined but is not Tracheophyta
    if (!!formattedObservation[PLANT_PHYLUM] && formattedObservation[PLANT_PHYLUM].toLowerCase() !== 'tracheophyta') {
        errorFields = errorFields.concat([PLANT_PHYLUM, PLANT_ORDER, PLANT_FAMILY, PLANT_GENUS, PLANT_SPECIES, PLANT_TAXON_RANK])
    }

    formattedObservation[INATURALIST_URL] = observation['uri'] ?? ''

    // Set error flags as a semicolon-separated list of fields (non-empty fields and additional flags)
    formattedObservation[ERROR_FLAGS] = nonEmptyFields.filter((field) => !formattedObservation[field]).concat(errorFields).join(';')

    return formattedObservation
}

/*
 * formatObservations()
 * Formats raw iNaturalist observations and duplicates them by the number of bees collected
 */
async function formatObservations(observations, updateFormattingProgress) {
    let formattedObservations = []

    // Fetch the elevation data for rows with coordinates
    let coordinates = new Set()
    for (const observation of observations) {
        const latitude = observation.geojson?.coordinates?.at(1)?.toFixed(4)?.toString() ?? ''
        const longitude = observation.geojson?.coordinates?.at(0)?.toFixed(4)?.toString() ?? ''

        if (!latitude || !longitude) { continue }

        const coordinate = `${latitude},${longitude}`
        coordinates.add(coordinate)
    }
    coordinates = [...coordinates]
    console.log(`\t\tReading ${coordinates.length} elevations...`)
    const elevations = await getElevations(coordinates)

    // Read known place and taxonomy data from /api/data/places.json and /api/data/taxa.json respectively
    const places = readPlacesFile()
    const taxa = readTaxaFile()

    let i = 0
    for (const observation of observations) {
        const formattedObservation = await formatObservation(observation, places, elevations, taxa)
        await updateFormattingProgress(`${(100 * (i++) / observations.length).toFixed(2)}%`)

        // SPECIMEN_ID is initially set to the number of bees collected
        // Now, duplicate observations a number of times equal to this value and overwrite SPECIMEN_ID to index the duplications
        if (formattedObservation[SPECIMEN_ID] !== '') {
            try {
                const beesCollected = parseInt(formattedObservation[SPECIMEN_ID])

                for (let i = 1; i < beesCollected + 1; i++) {
                    const duplicateObservation = Object.assign({}, formattedObservation)
                    duplicateObservation[SPECIMEN_ID] = i.toString()

                    formattedObservations.push(duplicateObservation)
                }
            } catch (err) {
                formattedObservations.push(formattedObservation)
            }
        }
    }

    return formattedObservations
}

/*
 * readObservationsFileChunks()
 * A generator function that reads a given observations CSV file into memory in chunks of a given size
 */
async function* readObservationsFileChunks(filePath, chunkSize) {
    // Create the read stream and pipe it to a CSV parser
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' })
    const parser = parse({ columns: true, skip_empty_lines: true, relax_quotes: true })
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
 * getDayOfYear()
 * Calculates the day of the year (1 - 366) of a given Date object
 */
function getDayOfYear(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        return
    }

    const startDate = new Date(date.getFullYear(), 0, 0)
    const dateDifference = date - startDate
    const dayMilliseconds = 1000 * 60 * 60 * 24
    return Math.floor(dateDifference / dayMilliseconds)
}

/*
 * formatChunkRow()
 * Fully formats an observation object from a pre-existing row
 */
function formatChunkRow(row) {
    // The final field set should be a union of the standard template and the given row
    // The given row's values will overwrite the template's values
    const formattedRow = Object.assign({}, observationTemplate, row)

    // Fill RECORDED_BY if empty
    const firstName = formattedRow[FIRST_NAME]
    const lastName = formattedRow[LAST_NAME]
    formattedRow[RECORDED_BY] ||= `${firstName}${(firstName && lastName) ? ' ' : ''}${lastName}`

    // Set VERBATIM_DATE to default formatting
    formattedRow[VERBATIM_DATE] = `${formattedRow[MONTH]}/${formattedRow[DAY]}/${formattedRow[YEAR]}`

    // Fill START_DAY_OF_YEAR and END_DAY_OF_YEAR if DAY2, MONTH2, and YEAR2 are defined
    // Overwrite VERBATIM_DATE with two-date format
    if (!!formattedRow[DAY2] && !!formattedRow[MONTH2] && !!formattedRow[YEAR2]) {
        const day1 = parseInt(formattedRow[DAY])
        // Convert month to its index (subtract 1)
        const month1Index = parseInt(formattedRow[MONTH]) - 1
        const year1 = parseInt(formattedRow[YEAR])
        // Set the time to noon to avoid timezone errors
        const date1 = new Date(year1, month1Index, day1, 12)

        formattedRow[START_DAY_OF_YEAR] = getDayOfYear(date1)?.toString() ?? ''

        const day2 = parseInt(formattedRow[DAY2])
        // Convert month to its index (subtract 1)
        const month2Index = parseInt(formattedRow[MONTH2]) - 1
        const year2 = parseInt(formattedRow[YEAR2])
        // Set the time to noon to avoid timezone errors
        const date2 = new Date(year2, month2Index, day2, 12)

        formattedRow[END_DAY_OF_YEAR] = getDayOfYear(date2)?.toString() ?? ''

        formattedRow[VERBATIM_DATE] = `${formattedRow[YEAR]}-${formattedRow[MONTH]}-${formattedRow[DAY]}/${formattedRow[YEAR2]}-${formattedRow[MONTH2]}-${formattedRow[DAY2]}`
    }

    // Enforce 4-decimal-point latitude and longitude
    const latitude = parseFloat(formattedRow[LATITUDE])
    const longitude = parseFloat(formattedRow[LONGITUDE])
    formattedRow[LATITUDE] = !isNaN(latitude) ? latitude.toFixed(4).toString() : formattedRow[LATITUDE]
    formattedRow[LONGITUDE] = !isNaN(longitude) ? longitude.toFixed(4).toString() : formattedRow[LONGITUDE]

    // A list of fields to flag in addition to the non-empty fields
    let errorFields = []

    // Flag LOCALITY if it contains street suffixes
    if (includesStreetSuffix(formattedRow[LOCALITY])) { errorFields.push(LOCALITY) }

    // Flag ACCURACY if it is greater than 250 meters
    if (parseInt(formattedRow[ACCURACY]) > 250) { errorFields.push(ACCURACY) }    

    // Flag all plant taxonomy fields if the phylum is defined but is not Tracheophyta
    if (!!formattedRow[PLANT_PHYLUM] && formattedRow[PLANT_PHYLUM].toLowerCase() !== 'tracheophyta') {
        errorFields = errorFields.concat([PLANT_PHYLUM, PLANT_ORDER, PLANT_FAMILY, PLANT_GENUS, PLANT_SPECIES, PLANT_TAXON_RANK])
    }

    // Set error flags as a semicolon-separated list of fields (non-empty fields and additional flags)
    formattedRow[ERROR_FLAGS] = nonEmptyFields.filter((field) => !formattedRow[field]).concat(errorFields).join(';')

    return formattedRow
}

/*
 * fetchObservationsById()
 * Fetches a list of observations from iNaturalist by their individual IDs
 */
async function fetchObservationsById(observationIds) {
    // observationIds can be a very long list of IDs, so batch requests to avoid iNaturalist API refusal
    const partitionSize = 200
    const nPartitions = Math.floor(observationIds.length / partitionSize) + 1
    let partitionStart = 0
    let partitionEnd = Math.min(partitionSize, observationIds.length)

    // Gather results until all partitions are complete
    let results = []
    for (let i = 0; i < nPartitions; i++) {
        const requestURL = `https://api.inaturalist.org/v1/observations?per_page=${partitionSize}&id=${observationIds.slice(partitionStart, partitionEnd).join(',')}`

        // Fetch and concatenate the data, catching errors
        try {
            // Make requests with exponential backoff to avoid API throttling
            for (let i = 1000; i <= 8000; i *= 2) {
                const res = await fetch(requestURL)

                if (res.ok) {
                    const resJSON = await res.json()
                    results = results.concat(resJSON['results'])
                    break
                } else if (res.status === 429) {    // 'Too Many Requests'
                    console.error(`Hit API request limit. Waiting ${i} milliseconds...`)
                    await delay(i)
                } else {
                    console.error(`Bad response while fetching '${requestURL}':`, res)
                    break
                }
            }
        } catch (err) {
            console.error(`ERROR while fetching ${requestURL}:`, err)
        }

        // Update the partition markers
        partitionStart = partitionEnd
        partitionEnd = Math.min(partitionEnd + partitionSize, observationIds.length)
    }

    return results
}

/*
 * updateChunkRow()
 * Updates specific values (location, elevation, and taxonomy) in a formatted row from its corresponding iNaturalist observation
 */
async function updateChunkRow(row, observation, elevations, taxa) {
    if (!row) {
        return
    }

    // Overwrite the current elevation
    const coordinate = `${row[LATITUDE]},${row[LONGITUDE]}`
    row[ELEVATION] = elevations[coordinate] || ''

    // Update the coordinate fields if the accuracy is better (smaller) or as good
    const prevAccuracy = parseInt(row[ACCURACY])
    const newAccuracy = observation?.positional_accuracy ?? Infinity
    if (newAccuracy < prevAccuracy) {
        const latitude = observation?.geojson?.coordinates?.at(1)?.toFixed(4)?.toString() || row[LATITUDE]
        const longitude = observation?.geojson?.coordinates?.at(0)?.toFixed(4)?.toString() || row[LONGITUDE]

        // Update the elevation in case the location changed
        row[ELEVATION] = await getElevation(latitude, longitude) || ''

        row[LATITUDE] = latitude
        row[LONGITUDE] = longitude
        row[ACCURACY] = newAccuracy.toString() || ''
    }

    if (observation) {
        row[RESOURCE_RELATIONSHIP] = 'visits flowers of'
        row[RELATED_RESOURCE_ID] = observation.uuid

        // Look up and update the plant taxonomy
        const plantTaxonomy = getPlantAncestry(observation.taxon, taxa)
        row[PLANT_PHYLUM] = plantTaxonomy.phylum
        row[PLANT_ORDER] = plantTaxonomy.order
        row[PLANT_FAMILY] = plantTaxonomy.family
        row[PLANT_GENUS] = plantTaxonomy.genus
        row[PLANT_SPECIES] = plantTaxonomy.species

        // As a fallback, search the plant taxonomy upward for the first truthy rank
        const minRank = ['species', 'genus', 'family', 'order', 'phylum'].find((rank) => !!plantTaxonomy[rank])
        row[PLANT_TAXON_RANK] = observation.taxon?.rank || minRank || ''
    }

    // Rewrite the ERROR_FLAGS field based on the new data
    let errorFields = []

    // Flag LOCALITY if it contains street suffixes
    if (includesStreetSuffix(row[LOCALITY])) { errorFields.push(LOCALITY) }

    // Flag ACCURACY if it is greater than 250 meters
    if (parseInt(row[ACCURACY]) > 250) { errorFields.push(ACCURACY) }

    // Flag all plant taxonomy fields if the phylum is defined but is not Tracheophyta
    if (!!row[PLANT_PHYLUM] && row[PLANT_PHYLUM].toLowerCase() !== 'tracheophyta') {
        errorFields = errorFields.concat([PLANT_PHYLUM, PLANT_ORDER, PLANT_FAMILY, PLANT_GENUS, PLANT_SPECIES, PLANT_TAXON_RANK])
    }

    // Set error flags as a semicolon-separated list of fields (non-empty fields and additional flags)
    row[ERROR_FLAGS] = nonEmptyFields.filter((field) => !row[field]).concat(errorFields).join(';')
}

/*
 * formatChunk()
 * Formats and updates a chunk of pre-existing observation data
 */
async function formatChunk(chunk, updateChunkProgress) {
    await updateChunkProgress('0.00')

    // Apply standard formatting
    const formattedChunk = chunk.map((row) => formatChunkRow(row))

    // Fetch the iNaturalist observations for rows that have an iNaturalist URL
    let observationIds = new Set()
    for (let i = 0; i < chunk.length; i++) {
        const url = chunk[i][INATURALIST_URL]
        const urlId = url?.split('/')?.pop()

        if (!!urlId && !isNaN(urlId)) {
            observationIds.add(urlId)
        }
    }
    observationIds = [...observationIds]
    console.log(`\t\t\tFetching ${observationIds.length} observations...`)
    const observations = await fetchObservationsById(observationIds)

    // Fetch the elevation data for rows with coordinates
    let coordinates = new Set()
    for (let i = 0; i < chunk.length; i++) {
        if (!chunk[i][LATITUDE] || !chunk[i][LONGITUDE]) { continue }

        const coordinate = `${chunk[i][LATITUDE]},${chunk[i][LONGITUDE]}`
        coordinates.add(coordinate)
    }
    coordinates = [...coordinates]
    console.log(`\t\t\tReading ${coordinates.length} elevations...`)
    const elevations = await getElevations(coordinates)

    // Read known taxonomy data from /api/data/taxa.json
    const taxa = readTaxaFile()

    // Update rows with the new data from iNaturalist
    let i = 1
    console.log(`\t\t\tFormatting ${formattedChunk.length} rows...`)
    for (const row of formattedChunk) {
        // Find the corresponding iNaturalist observation for the current row by matching the iNaturalist URL
        const matchingObservation = observations.find((observation) => observation['uri'] && (observation['uri'] === row[INATURALIST_URL]))
        // Update the row data
        await updateChunkRow(row, matchingObservation, elevations, taxa)

        await updateChunkProgress((100 * (i++) / formattedChunk.length).toFixed(2).toString())
    }

    await updateChunkProgress('100.00')
    return formattedChunk
}

/*
 * isRowEmpty()
 * A boolean function that returns whether a row has all blank entries
 */
function isRowEmpty(row) {
    for (const field of Object.keys(row)) {
        if (!!row[field] && row[field] !== '') {
            return false
        }
    }
    return true
}

/*
 * generateRowKey()
 * Creates a unique key string for a given formatted observation row
 */
function generateRowKey(row) {
    // Which key fields to use depend on which are available:
    // At minimum, use first name, last name, day, month, and year, sample ID, and specimen ID
    // If available, use the observation number
    // If available, use iNaturalist URL
    let keyFields = [FIRST_NAME, LAST_NAME, SAMPLE_ID, SPECIMEN_ID, DAY, MONTH, YEAR]
    if (row[OBSERVATION_NO]) {
        keyFields.push(OBSERVATION_NO)
    }
    if (row[INATURALIST_URL]) {
        keyFields.push(INATURALIST_URL)
    }

    // Get a list of the corresponding values for the key fields
    const keyValues = keyFields.map((field) => String(row[field] || ''))

    // Combine and hash the key values into a single unique key string
    const compositeKey = Crypto.createHash('sha256')
        .update(keyValues.join(','))
        .digest('hex')
    
    return compositeKey
}

/*
 * compareStrings()
 * A comparison function for strings that places empty strings last
 */
function compareStrings(str1, str2) {
    if (str1 === '' && str2 !== '') {
        return 1
    } else if (str1 !== '' && str2 === '') {
        return -1
    } else if (str1 === '' && str2 === '') {
        return 0
    }

    return (str1 > str2) - (str1 < str2)
}

/*
 * compareNumericStrings()
 * A comparison function for strings that are parseable as numbers; places empty strings last
 */
function compareNumericStrings(str1, str2) {
    if (str1 === '' && str2 !== '') {
        return 1
    } else if (str1 !== '' && str2 === '') {
        return -1
    } else if (str1 === '' && str2 === '') {
        return 0
    }

    if (!isNaN(str1) && !isNaN(str2)) {
        const num1 = parseInt(str1)
        const num2 = parseInt(str2)
        return (num1 > num2) - (num1 < num2)
    } else {
        return compareStrings(str1, str2)
    }
}

/*
 * compareRows()
 * A custom comparison function for formatted observation rows; sorts in the following order with empty strings last
 * 1. OBSERVATION_NO
 * 2. LAST_NAME
 * 3. FIRST_NAME
 * 4. OBA_MONTH
 * 5. OBA_DAY
 * 6. SAMPLE_ID
 * 7. SPECIMEN_ID
 */
function compareRows(row1, row2) {
    const observationNumberComparison = compareNumericStrings(row1[OBSERVATION_NO], row2[OBSERVATION_NO])
    if (observationNumberComparison !== 0) {
        return observationNumberComparison
    }

    const lastNameComparison = compareStrings(row1[LAST_NAME], row2[LAST_NAME])
    if (lastNameComparison !== 0) {
        return lastNameComparison
    }

    const firstNameComparison = compareStrings(row1[FIRST_NAME], row2[FIRST_NAME])
    if (firstNameComparison !== 0) {
        return firstNameComparison
    }

    const aliasComparison = compareStrings(row1[INATURALIST_ALIAS], row2[INATURALIST_ALIAS])
    if (aliasComparison !== 0) {
        return aliasComparison
    }

    const monthComparison = compareNumericStrings(row1[MONTH], row2[MONTH])
    if (monthComparison !== 0) {
        return monthComparison
    }

    const dayComparison = compareNumericStrings(row1[DAY], row2[DAY])
    if (dayComparison !== 0) {
        return dayComparison
    }

    const sampleIDComparison = compareNumericStrings(row1[SAMPLE_ID], row2[SAMPLE_ID])
    if (sampleIDComparison !== 0) {
        return sampleIDComparison
    }

    const specimenIDComparison = compareNumericStrings(row1[SPECIMEN_ID], row2[SPECIMEN_ID])
    if (specimenIDComparison !== 0) {
        return specimenIDComparison
    }

    return 0
}

/*
 * sortAndDedupeChunk()
 * Sorts a chunk of observvation data and removes duplicate entries
 */
function sortAndDedupeChunk(chunk, seenKeys) {
    // The resulting chunk of unique, sorted data
    const uniqueRows = []

    // First, add rows with observation numbers since these are presumed to be unique
    for (const row of chunk) {
        if (!!row[OBSERVATION_NO]) {
            // Create a key for this row and add it to the set of seen keys
            const key = generateRowKey(row)
            seenKeys.add(key)
            // Add the row to the output
            uniqueRows.push(row)
        }
    }

    // Next, add other rows if they are unique
    for (const row of chunk) {
        if (isRowEmpty(row) || !!row[OBSERVATION_NO]) {
            continue
        }

        // Create a key for this row and check that it hasn't been seen yet
        const key = generateRowKey(row)
        if (!seenKeys.has(key)) {
            // Record the row's key as seen
            seenKeys.add(key)
            // Add the row to the output
            uniqueRows.push(row)
        }
    }

    // Sort the output using the custom comparison function for formatted rows
    return uniqueRows.sort(compareRows)
}

/*
 * writeObservationsFile()
 * Writes a list of observation objects to a CSV file at the given file path
 */
function writeObservationsFile(filePath, observations) {
    const header = Object.keys(observationTemplate)
    const csv = stringifySync(observations, { header: true, columns: header })

    fs.writeFileSync(filePath, csv)
}

/*
 * writeChunkToTempFile()
 * Creates a temporary file for a chunk of observation data and writes to it
 */
function writeChunkToTempFile(chunk, tempFiles) {
    // Generate a unique file path in the temporary files directory
    const tempFileName = `${Crypto.randomUUID()}.csv`
    const tempFilePath = path.join('./api/data/temp/', tempFileName)
    tempFiles.push(tempFilePath)

    writeObservationsFile(tempFilePath, chunk)

    return tempFilePath
}

/*
 * createParser()
 * Opens a read stream and linked CSV parser for a given file path
 */
function createParser(filePath) {
    const stream = fs.createReadStream(filePath, { encoding: 'utf-8' })
    const parser = stream.pipe(parse({ columns: true, skip_empty_lines: true, relax_quotes: true }))

    return { stream, parser }
}

/*
 * mergeTempFilesBatch()
 * Combines a batch of observation files into a single, sorted output file using a given comparison function
 */
async function mergeTempFilesBatch(inputFiles, outputFile) {
    // A list of open read streams and CSV parsers (open pair for each file in the batch)
    const readers = []
    // The current "top" rows from the open files in the batch
    const currentRows = []

    // Open each file in the batch
    for (const filePath of inputFiles) {
        try {
            // Create the read stream and CSV parser
            const { stream, parser } = createParser(filePath)
            readers.push({ stream, parser })
            
            // Get the first row
            const iterator = parser[Symbol.asyncIterator]()
            const { value: firstRow } = await iterator.next()

            // Add the row to currentRows
            currentRows.push({
                row: firstRow,
                iterator
            })
        } catch (error) {
            // Log the error and rethrow it; there is no way to gracefully recover
            console.error(`Error opening file ${filePath}`)
            readers.forEach(({ stream }) => stream.destroy())
            throw error
        }
    }

    // Open a write stream and stringifier for the output file
    const outputFileStream = fs.createWriteStream(outputFile, { encoding: 'utf-8' })
    const stringifier = stringify({ header: true, columns: Object.keys(observationTemplate) })
    stringifier.pipe(outputFileStream)

    let i = 0
    // Repeatedly write the "minimum" row of currentRows to the output file until there are none left
    while (true) {
        // Record the index of each row within currentRows; filter out empty rows (e.g., from reaching the end of an open file)
        const validRows = currentRows
            .map((item, index) => ({
                row: item.row,
                index
            }))
            .filter((item) => !!item.row)

        // Break the loop if there are no more rows
        if (validRows.length === 0) {
            // console.log(`\t\tMerged ${i} rows`)
            break
        }

        // Find the row (in validRows) that has the minimum "value" using the given comparison function
        const minRow = validRows.reduce((min, current) => compareRows(current.row, min.row) < 0 ? current : min)

        // Create a function that guarantees write completion before continuing
        const writeAsync = (stringifier, data) => new Promise((resolve, reject) => {
            stringifier.write(data, (error) => {
                if (error) reject(error)
                else resolve()
            })
        })

        // Write the minimum row to the output file
        await writeAsync(stringifier, minRow.row)
        i++

        // Fetch the next row from the file which had the minimum row
        try {
            // Use the index in currentRows to get the iterator for the file that contained the minimum row; use the iterator to read the next row
            const { value: nextRow } = await currentRows[minRow.index].iterator.next()

            // Update currentRows to replace the minimum row with the next row, unless the end of the file was reached
            currentRows[minRow.index] = {
                row: nextRow,
                iterator: currentRows[minRow.index].iterator
            }
        } catch (error) {
            console.error('Error while reading next line:', error)
            // In case of an error, stop reading the file
            currentRows[minRow.index] = {
                row: null,
                iterator: currentRows[minRow.index].iterator
            }
        }
    }

    // Close the stringifier and read streams
    stringifier.end()
    readers.forEach(({ stream }) => stream.destroy())
}

/*
 * mergeTempFiles()
 * Merges a list of temporary files containing chunked observation data into a single, sorted file using a given comparison function
 */
async function mergeTempFiles(tempFiles, outputFilePath) {
    // Return immediately if there are no files to merge
    if (!tempFiles) return

    // Make a queue out of the given list of temporary files
    const filesQueue = [...tempFiles]

    // Merge batches of files from the queue until there are none left
    while (filesQueue.length > 0) {
        // console.log("\t\tMerge queue:" + " X".repeat(filesQueue.length))

        // Dequeue BATCH_SIZE files to merge
        const batch = filesQueue.splice(0, BATCH_SIZE)

        // If the files queue is empty and the batch contains all of the remaining temporary files, this is the last iteration
        if (filesQueue.length === 0 && batch.length === tempFiles.length) {
            // Merge into the output file on the last iteration
            await mergeTempFilesBatch(batch, outputFilePath)
        } else {
            // Otherwise, merge into a new temporary file
            const mergedPath = path.join('./api/data/temp', `${Crypto.randomUUID()}.csv`)
            await mergeTempFilesBatch(batch, mergedPath)
            // Add the new file to the queue and the list of temporary files
            filesQueue.push(mergedPath)
            tempFiles.push(mergedPath)
        }

        // Clean up files from the batch
        for (const filePath of batch) {
            fs.rmSync(filePath)
            tempFiles.splice(tempFiles.indexOf(filePath), 1)
        }
    }
}

/*
 * findLastObservationNumber()
 * Searches through a given observations file for the largest observation number
 */
async function findLastObservationNumber(filePath) {
    let lastObservationNumber = undefined

    // Open a CSV parser for the given file path
    const { parser } = createParser(filePath)

    // Search linearly for the highest OBSERVATION_NO
    for await (const row of parser) {
        if (!!row[OBSERVATION_NO]) {
            // Parse OBSERVATION_NO as an integer and update lastObservationNumber
            const currentObservationNumber = row[OBSERVATION_NO]

            if (!isNaN(currentObservationNumber) && (!lastObservationNumber || currentObservationNumber > lastObservationNumber)) {
                lastObservationNumber = parseInt(currentObservationNumber)
            }
        }
    }

    return lastObservationNumber?.toString()
}

/*
 * incrementObservationNumber()
 * Takes a given observation number as a string and returns the next in the sequence, maintaining the year prefix
 */
function incrementObservationNumber(observationNumber) {
    // Catch invalid observation numbers
    if (!observationNumber || isNaN(observationNumber)) return ''

    // Convert the observation number to a string if it is not one
    if (typeof observationNumber !== 'string') {
        observationNumber = observationNumber.toString()
    }

    // Split the given number at the second character
    const prefix = observationNumber.slice(0, 2)
    const suffix = observationNumber.slice(2)

    // Convert the suffix to an integer, increment it, and parse it back to a string of fixed length
    let nextSuffix = parseInt(suffix)
    nextSuffix = (++nextSuffix).toString().padStart(suffix.length, '0')

    // Return the concatenated prefix and new suffix
    return prefix + nextSuffix
}

/*
 * indexData()
 * Automatically fills in the OBSERVATION_NO field for a given observations file
 */
async function indexData(filePath, year) {
    // Search for the highest observation number in the given file
    const lastObservationNumber = await findLastObservationNumber(filePath)

    // Construct a default observation number from the given year
    const yearPrefix = year.toString().slice(2)
    let nextObservationNumber = yearPrefix + '000001'

    // If an observation number was found in the given file, set the next observation number to one greater (carrying over the prefix)
    nextObservationNumber = !!lastObservationNumber && !isNaN(lastObservationNumber) ? incrementObservationNumber(lastObservationNumber) : nextObservationNumber

    // Create an input CSV parser and an output stringifier for a temporary file
    const { parser } = createParser(filePath)

    const tempFilePath = `./api/data/temp/${Crypto.randomUUID()}.csv`
    const outputFileStream = fs.createWriteStream(tempFilePath, { encoding: 'utf-8' })
    const stringifier = stringify({ header: true, columns: Object.keys(observationTemplate) })
    stringifier.pipe(outputFileStream)

    // Add each non-empty row from the input file to the temporary output file; fill in the observation number, occurrence ID, and resource ID if empty
    for await (const row of parser) {
        if (isRowEmpty(row)) continue

        if (!row[OBSERVATION_NO]) {
            row[OBSERVATION_NO] = nextObservationNumber
            nextObservationNumber = incrementObservationNumber(nextObservationNumber)
        }

        if (row[STATE] === 'OR') {
            if (!!row[OBSERVATION_NO] && !isNaN(row[OBSERVATION_NO])) {
                row[OCCURRENCE_ID] ||= `https://osac.oregonstate.edu/OBS/OBA_${row[OBSERVATION_NO]}`
                row[RESOURCE_ID] ||= row[OCCURRENCE_ID]
            }
        } else {
            row[OCCURRENCE_ID] = ''
            row[RESOURCE_ID] = ''
        }

        // Create a function that guarantees write completion before continuing
        const writeAsync = (stringifier, data) => new Promise((resolve, reject) => {
            stringifier.write(data, (error) => {
                if (error) reject(error)
                else resolve()
            })
        })

        await writeAsync(stringifier, row)
    }
    // Destroy the input and output streams
    stringifier.end()
    parser.destroy()

    // Wait a second for file permissions to release
    await delay(1000)

    // Move the temporary output file to the input file path (overwrites the original file and renames the temporary file)
    fs.renameSync(tempFilePath, filePath)
}

/*
 * main()
 * Listens for tasks on a RabbitMQ queue; pulls iNaturalist data, merges it with a provided dataset, and formats and indexes the combined data
 */
async function main() {
    try {
        const connection = await amqp.connect(rabbitmqURL)
        const observationsChannel = await connection.createChannel()
        await observationsChannel.assertQueue(observationsQueueName)

        console.log(`Consuming queue '${observationsQueueName}'...`)
        observationsChannel.consume(observationsQueueName, async (msg) => {
            if (!msg) { return }

            const taskId = msg.content.toString()
            const task = await getTaskById(taskId)

            // ACK immediately to prevent timeout
            observationsChannel.ack(msg)

            console.log(`${new Date().toLocaleTimeString('en-US')} Processing task ${taskId}...`)

            await updateTaskInProgress(taskId, { currentStep: 'Pulling observations from iNaturalist' })
            console.log('\tPulling observations from iNaturalist...')

            const observations = await pullObservations(task, async (percentage) => {
                await updateTaskInProgress(taskId, { currentStep: 'Pulling observations from iNaturalist', percentage })
            })

            await updateTaskInProgress(taskId, { currentStep: 'Updating place data' })
            console.log('\tUpdating place data...')

            await updatePlaces(observations)

            await updateTaskInProgress(taskId, { currentStep: 'Updating taxonomy data' })
            console.log('\tUpdating taxonomy data...')

            await updateTaxa(observations)

            await updateTaskInProgress(taskId, { currentStep: 'Formatting new observations' })
            console.log('\tFormatting new observations...')

            const formattedObservations = await formatObservations(observations, async (percentage) => {
                await updateTaskInProgress(taskId, { currentStep: 'Formatting new observations', percentage })
            })

            await updateTaskInProgress(taskId, { currentStep: 'Formatting provided dataset' })
            console.log('\tFormatting provided dataset...')

            const inputFilePath = './api/data' + task.dataset.replace('/api', '')    // task.dataset has a '/api' suffix, which should be removed
            const outputFileName = `${Crypto.randomUUID()}.csv`
            const outputFilePath = './api/data/observations/' + outputFileName

            const seenKeys = new Set()
            const tempFiles = []
            try {
                // Separate the provided dataset into chunks and store them in temporary files; also, format and update the data
                let i = 1
                for await (const chunk of readObservationsFileChunks(inputFilePath, CHUNK_SIZE)) {
                    console.log(`\t\tChunk ${i}`)
                    const formattedChunk = await formatChunk(chunk, async (percentage) => {
                        await updateTaskInProgress(taskId, { currentStep: 'Formatting provided dataset', percentage: `Chunk ${i}: ${percentage}%` })
                    })

                    const sortedChunk = sortAndDedupeChunk(formattedChunk, seenKeys)
                    if (sortedChunk) {
                        writeChunkToTempFile(sortedChunk, tempFiles)
                    }

                    i++
                }

                await updateTaskInProgress(taskId, { currentStep: 'Merging new observations with provided dataset' })
                console.log('\tMerging new observations with provided dataset...')

                // Create a chunk for the new data from iNaturalist
                if (formattedObservations.length > 0) {
                    const sortedChunk = sortAndDedupeChunk(formattedObservations, seenKeys)
                    if (sortedChunk) {
                        writeChunkToTempFile(sortedChunk, tempFiles)
                    }
                }

                // Merge all chunks into the output file
                await mergeTempFiles(tempFiles, outputFilePath)

                await updateTaskInProgress(taskId, { currentStep: 'Indexing merged data' })
                console.log('\tIndexing merged data...')

                const year = (new Date()).getUTCFullYear()
                await indexData(outputFilePath, year)

                await updateTaskResult(taskId, { uri: `/api/observations/${outputFileName}`, fileName: outputFileName })
            } catch (error) {
                console.error(error)
                await updateTaskFailure(taskId)
            }
            
            console.log(`${new Date().toLocaleTimeString('en-US')} Completed task ${taskId}`)

            limitFilesInDirectory('./api/data/observations', MAX_OBSERVATIONS)
            clearTasksWithoutFiles()

            clearDirectory('./api/data/temp')
        })
    } catch (err) {
        // console.error(err)
        throw err
    }
}

// Connect to the Mongo Server before running the main process
connectToDb().then(() => {
    main()
})