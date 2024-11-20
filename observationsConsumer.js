import Crypto from 'node:crypto'
import fs from 'fs'
import path from 'path'
import amqp from 'amqplib'
import { fromFile } from 'geotiff'
import { parse } from 'csv-parse'
import { stringify as stringifySync } from 'csv-stringify/sync'
import 'dotenv/config'

import { connectToDb } from './api/lib/mongo.js'
import { observationsQueueName } from './api/lib/rabbitmq.js'
import { clearTasksWithoutFiles, getTaskById, updateTaskInProgress, updateTaskResult } from './api/models/task.js'
import { connectToS3, getS3Object } from './api/lib/aws-s3.js'
import { clearDirectory, limitFilesInDirectory } from './api/lib/utilities.js'
import { stringify } from 'csv-stringify'

/* Constants */

// RabbitMQ connection URL
const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost'
const rabbitmqURL = `amqp://${rabbitmqHost}`
// Maximum number of output files stored on the server
const MAX_OBSERVATIONS = 10
// Maximum number of observations to read from a file at once
const CHUNK_SIZE = 10000
// Number of temporary files to merge together at once
const BATCH_SIZE = 2
// Field names
const ERROR_FLAGS = 'Error Flags'
const OBSERVATION_NO = 'Observation No.'
const INATURALIST_ID = 'iNaturalist ID'
const INATURALIST_ALIAS = 'iNaturalist Alias'
const FIRST_NAME = 'Collector - First Name'
const FIRST_INITIAL = 'Collector - First Initial'
const LAST_NAME = 'Collector - Last Name'
const SAMPLE_ID = 'Sample ID'
const SPECIMEN_ID = 'Specimen ID'
const OBA_DAY = 'Collection Day 1'
const OBA_MONTH = 'Month 1'
const OBA_YEAR = 'Year 1'
const OBA_TIME = 'Time 1'
const OBA_COUNTRY = 'Country'
const OBA_STATE = 'State'
const OBA_COUNTY = 'County'
const OBA_LOCATION = 'Location'
const OBA_ABBR_LOCATION = 'Abbreviated Location'
const OBA_LATITUDE = 'Dec. Lat.'
const OBA_LONGITUDE = 'Dec. Long.'
const ACCURACY = 'Lat/Long Accuracy'
const ELEVATION = 'Elevation'
const COLLECTION_METHOD = 'Collection method'
const FAMILY = 'Associated plant - family'
const SCIENTIFIC_NAME = 'Associated plant - genus, species'
const INATURALIST_URL = 'Associated plant - Inaturalist URL'
const CITATION = 'bibliographicCitation'
const DATASET_NAME = 'datasetName'
const RECORDED_BY = 'recordedBy'
const ASSOCIATED_TAXA = 'associatedTaxa'
const SAMPLING_PROTOCOL = 'samplingProtocol'
const DARWIN_YEAR = 'year'
const DARWIN_MONTH = 'month'
const DARWIN_DAY = 'day'
const VERBATIM_DATE = 'verbatimEventDate'
const FIELD_NOTES = 'fieldNotes'
const DARWIN_COUNTRY = 'country'
const DARWIN_STATE = 'stateProvince'
const DARWIN_COUNTY = 'county'
const DARWIN_LOCATION = 'locality'
const DARWIN_LATITUDE = 'decimalLatitude'
const DARWIN_LONGITUDE = 'decimalLongitude'
// Template object for observations; static values are provided as strings, data-dependent values are set to null
const observationTemplate = {
    'Error Flags': null,
    'Verified': '',
    'Date Added': '',
    'Date Label Print': '',
    'Date Label Sent': '',
    'Observation No.': null,
    'Voucher No.': '',
    'iNaturalist ID': null,
    'iNaturalist Alias': null,
    'Collector - First Name': null,
    'Collector - First Initial': null,
    'Collector - Last Name': null,
    'Sample ID': null,
    'Specimen ID': null,
    'Collection Day 1': null,
    'Month 1': null,
    'Year 1': null,
    'Time 1': null,
    'Collection Day 2': '',
    'Month 2': '',
    'Year 2': '',
    'Time 2': '',
    'Collect Date 2 Merge': '',
    'Country': null,
    'State': null,
    'County': null,
    'Location': null,
    'Collection Site Description': '',
    'Abbreviated Location': null,
    'Dec. Lat.': null,
    'Dec. Long.': null,
    'Lat/Long Accuracy': null,
    'Elevation': null,
    'Collection method': 'net',
    'Associated plant - family': null,
    'Associated plant - genus, species': null,
    'Associated plant - Inaturalist URL': null,
    'Det. Volunteer - Family': '',
    'Det. Volunteer - Genus': '',
    'Det. Volunteer - Species': '',
    'Det. Volunteer - Sex/Caste': '',
    'Det LR Best - Genus': '',          // sic
    'Det. LR Best - Species': '',
    'Det LR Best - Sex/Caste': '',      // sic
    'id': '',
    'type': 'Dataset',
    'language': 'en',
    'license': 'http://creativecommons.org/licenses/by-nc-sa/3.0/',
    'rightsHolder': 'Oregon State University',
    'bibliographicCitation': null,
    'institutionID': 'https://www.gbif.org/grscicoll/institution/f23b6ebc-db50-482b-a923-f26b5cd8d2d1',
    'datasetID': 'DOI: http://dx.doi.org/10.5399/osu/cat_osac.5.1.4647',
    'institutionCode': 'OSAC',
    'collectionCode': 'osac',
    'datasetName': null,
    'ownerInstitutionCode': 'OSAC',
    'basisOfRecord': 'preservedSpecimen',
    'occurrenceID': '',
    'catalogNumber': '',
    'recordedBy': null,
    'sex': '',
    'disposition': 'confirmedPresent',
    'otherCatalogNumbers': '',
    'associatedTaxa': null,
    'samplingProtocol': null,
    'year': null,
    'month': null,
    'day': null,
    'verbatimEventDate': null,
    'fieldNotes': null,
    'country': null,
    'stateProvince': null,
    'county': null,
    'locality': null,
    'decimalLatitude': null,
    'decimalLongitude': null,
    'identifiedBy': '',
    'dateIdentified': '',
    'identificationRemarks': '',
    'scientificName': '',
    'phylum': '',
    'class': '',
    'order': '',
    'family': '',
    'genus': '',
    'subgenus': '',
    'specificEpithet': '',
    'taxonRank': ''
}
// A list of fields that should be flagged if empty
const nonEmptyFields = [
    'iNaturalist ID',
    'iNaturalist Alias',
    'Collector - First Name',
    'Collector - First Initial',
    'Collector - Last Name',
    'Sample ID',
    'Specimen ID',
    'Collection Day 1',
    'Month 1',
    'Year 1',
    'Time 1',
    'Country',
    'State',
    'County',
    'Location',
    'Abbreviated Location',
    'Dec. Lat.',
    'Dec. Long.',
    'Elevation',
    'Associated plant - family',
    'Associated plant - genus, species',
    'Associated plant - Inaturalist URL',
    'recordedBy',
    'associatedTaxa',
    'year',
    'month',
    'day',
    'country',
    'stateProvince',
    'county',
    'locality',
    'decimalLatitude',
    'decimalLongitude'
]
// Roman numerals 1 to 12
const monthNumerals = [
    'I',
    'II',
    'III',
    'IV',
    'V',
    'VI',
    'VII',
    'VIII',
    'IX',
    'X',
    'XI',
    'XII'
]
// Abbreviations for countries keyed by how iNaturalist refers to them
const countryAbbreviations = {
    'United States': 'USA',
    'Canada': 'CA'
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
async function pullSourceObservations(sourceId, minDate, maxDate) {
    let response = await fetchObservations(sourceId, minDate, maxDate, 1)
    let results = response?.results ?? []

    const totalResults = parseInt(response?.total_results ?? '0')
    let totalPages = Math.floor(totalResults / 200) + 1

    for (let i = 2; i < totalPages + 1; i++) {
        response = await fetchObservations(sourceId, minDate, maxDate, i)
        results = results.concat(response?.results ?? [])
    }

    return results
}

/*
 * pullObservations()
 * Pulls all observations specified in a given task
 */
async function pullObservations(task) {
    let observations = []

    for (const sourceId of task.sources) {
        observations = observations.concat(await pullSourceObservations(sourceId, task.minDate, task.maxDate))
    }

    return observations
}

/*
 * readPlacesFile()
 * Parses /api/data/places.json into a JS object, fetching a copy from S3 if necessary
 */
async function readPlacesFile() {
    // If /api/data/places.json doesn't exist locally, download a base version from S3 and save it
    if (!fs.existsSync('./api/data/places.json')) {
        const s3PlacesData = await getS3Object('obp-server-data', 'places.json')
        const s3PlacesString = await s3PlacesData?.transformToString()
        fs.writeFileSync('./api/data/places.json', s3PlacesString ?? '{}')
    }

    // Read and parse /api/data/places.json
    const placesData = fs.readFileSync('./api/data/places.json')
    return JSON.parse(placesData)
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
    const places = await readPlacesFile()

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
 * readUsernamesFile()
 * Parses s3://obp-server-data/usernames.json into a JS object
 */
async function readUsernamesFile() {
    const usernamesData = await getS3Object('obp-server-data', 'usernames.json')
    const usernamesJSONString = await usernamesData?.transformToString()
    return JSON.parse(usernamesJSONString ?? '{}')
}

/*
 * lookUpUserName()
 * Searches for the first name, first initial, and last name of an iNaturalist user in /api/data/usernames.json
 */
async function lookUpUserName(user) {
    // Default to empty strings
    let firstName = '', firstInitial = '', lastName = ''

    // Check that the user field exists
    if (!user) {
        return { firstName, firstInitial, lastName }
    }

    // Get the known name data
    const usernames = await readUsernamesFile()

    // Attempt to extract the user's full name
    const userLogin = user['login']
    const fullName = usernames[userLogin]?.split(' ')

    // Format the outputs if the full name was found
    if (fullName) {
        firstName = fullName[0]
        firstInitial = firstName[0] + '.'
        lastName =  fullName.length > 1 ? fullName[fullName.length - 1] : ''
    }
    
    return { firstName, firstInitial, lastName }
}

/*
 * lookUpPlaces()
 * Searches for country, state/province, and county names in /api/data/places.json
 */
async function lookUpPlaces(placeIds) {
    // Default to empty strings
    let country = '', stateProvince = '', county = ''

    // Check that the placeIds field exists
    if (!placeIds) {
        return { country, stateProvince, county }
    }

    // Get the known place data
    const places = await readPlacesFile()

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
 * getFamily()
 * Searches for a taxonomic family name in an observation's 'identifications' field
 */
function getFamily(identifications) {
    // Check that the identifications field exists
    if (!identifications) {
        return ''
    }

    // Search each identification
    for (const id of identifications) {
        // If the identification is a family, return its name; otherwise, search the ancestors field
        if (id.taxon?.rank === 'family') {
            return id.taxon?.name ?? ''
        } else if (id['ancestors']) {
            for (const ancestor of id['ancestors']) {
                if (ancestor['rank'] === 'family') {
                    return ancestor['name'] ?? ''
                }
            }
        }
    }

    // Default to an empty string if the search reaches this point
    return ''
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
 * fetchElevationFile()
 * Downloads a specific elevation file from S3 if it is not already available locally
 */
async function fetchElevationFile(fileKey) {
    const filePath = './api/data/' + fileKey

    if (!fs.existsSync(filePath)) {
        const fileStream = await getS3Object('obp-server-data', fileKey)
        const fileData = await fileStream?.transformToByteArray()

        if (fileData) {
            fs.writeFileSync(filePath, fileData)
        }
    }

    return filePath
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
 * readElevationFromFile()
 * Searches for the elevation value of a given coordinate in a given GeoTIFF file
 */
async function readElevationFromFile(fileKey, latitude, longitude) {
    try {
        // Fetch the given file from AWS S3 if necessary
        const filePath = await fetchElevationFile(fileKey)

        // Read the given file's raster data using the geotiff package
        const tiff = await fromFile(filePath)
        const image = await tiff.getImage()
        const rasters = await image.readRasters()
        const data = rasters[0]

        // Calculate the row and column corresponding to the given coordinate
        const latitudeDecimalPart = latitude - Math.floor(latitude)
        const row = Math.floor(latitudeDecimalPart * rasters.height)

        const longitudeDecimalPart = longitude - Math.floor(longitude)
        const column = Math.floor(longitudeDecimalPart * rasters.width)

        // Look up the elevation value for the row and column, default to an empty string
        const elevation = data[column + rasters.width * row]

        // Close the GeoTIFF file
        tiff.close()

        return elevation?.toString() ?? ''
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

    // Create the file key for the elevation data file in which the coordinates lie
    const fileKey = `elevation/${cardinalLatitude}_${cardinalLongitude}_1arc_v3.tif`

    // Get the elevation at the precise coordinate from the elevation data file
    return await readElevationFromFile(fileKey, parseFloat(latitude), parseFloat(longitude))
}

/*
 * formatObservation()
 * Creates a fully formatted observation object from a raw iNaturalist observation
 */
async function formatObservation(observation, year) {
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

    // Parse user's name
    const { firstName, firstInitial, lastName } = await lookUpUserName(observation['user'])

    // Parse country, state/province, and county
    const { country, stateProvince, county } =  await lookUpPlaces(observation['place_ids'])

    /* Formatted fields as constants for re-use */

    // Look up the taxonomic family
    const family = getFamily(observation['identifications'])
    const scientificName = observation.taxon?.name ?? ''

    // Attempt to parse 'observed_on_string' as a JavaScript Date object
    const observedDate = observation['observed_on_string'] ? new Date(observation['observed_on_string']) : undefined

    // Extract the day, month, year, hour, and minute from the Date object
    const observedDay = observedDate?.getDate()
    const observedMonth = observedDate?.getMonth()
    const observedYear = observedDate?.getFullYear()
    const observedHour = observedDate?.getHours()
    const observedMinute = observedDate?.getMinutes()

    // Format the day, month, year, and time
    const formattedDay = !isNaN(observedDay) ? observedDay.toString() : ''
    const formattedMonth = !isNaN(observedMonth) ? observedMonth.toString() : ''
    const formattedYear = !isNaN(observedYear) ? observedYear.toString() : ''
    const formattedHours  = !isNaN(observedHour) ? observedHour.toString().padStart(2, '0') : undefined
    const formattedMinutes = !isNaN(observedMinute) ? observedMinute.toString().padStart(2, '0') : undefined
    const formattedTime = (formattedHours && formattedMinutes) ? `${formattedHours}:${formattedMinutes}` : ''
    
    // Format the location
    const formattedLocation = observation.place_guess?.split(/,\s*/)?.at(0)?.replace(countyRegex, '') ?? ''

    // Format the coordinates
    const formattedLatitude = observation.geojson?.coordinates?.at(1)?.toFixed(3)?.toString() ?? ''
    const formattedLongitude = observation.geojson?.coordinates?.at(0)?.toFixed(3)?.toString() ?? ''

    // A list of fields to flag in addition to the non-empty fields
    const errorFields = []

    /* Final formatting */

    // Label fields
    formattedObservation[INATURALIST_ID] = observation.user?.id?.toString() ?? ''
    formattedObservation[INATURALIST_ALIAS] = observation.user?.login ?? ''

    formattedObservation[FIRST_NAME] = firstName
    formattedObservation[FIRST_INITIAL] = firstInitial
    formattedObservation[LAST_NAME] = lastName

    formattedObservation[SAMPLE_ID] = getOFV(observation['ofvs'], 'Sample ID.')
    formattedObservation[SPECIMEN_ID] = getOFV(observation['ofvs'], 'Number of bees collected')

    formattedObservation[OBA_DAY] = formattedDay
    formattedObservation[OBA_MONTH] = monthNumerals[observedMonth] ?? ''
    formattedObservation[OBA_YEAR] = formattedYear
    formattedObservation[OBA_TIME] = formattedTime

    formattedObservation[OBA_COUNTRY] = countryAbbreviations[country] ?? country
    formattedObservation[OBA_STATE] = stateProvinceAbbreviations[stateProvince] ?? stateProvince
    formattedObservation[OBA_COUNTY] = county

    // Flag OBA_COUNTRY and OBA_STATE if they have an unexpected value
    if (!countryAbbreviations[country]) { errorFields.push(OBA_COUNTRY) }
    if (!stateProvinceAbbreviations[stateProvince]) { errorFields.push(OBA_STATE) }

    formattedObservation[OBA_LOCATION] = formattedLocation
    formattedObservation[OBA_ABBR_LOCATION] = formattedLocation

    // Flag OBA_LOCATION, OBA_ABBR_LOCATION, and DARWIN_LOCATION if formattedLocation contains any street suffixes
    if (includesStreetSuffix(formattedLocation)) {
        errorFields.push(OBA_LOCATION)
        errorFields.push(OBA_ABBR_LOCATION)
        errorFields.push(DARWIN_LOCATION)
    }

    formattedObservation[OBA_LATITUDE] = formattedLatitude
    formattedObservation[OBA_LONGITUDE] = formattedLongitude
    formattedObservation[ACCURACY] = observation.positional_accuracy?.toString() ?? ''

    // Flag ACCURACY if positional_accuracy is greater than 250 meters
    if (observation.positional_accuracy > 250) { errorFields.push(ACCURACY) }

    formattedObservation[ELEVATION] = await getElevation(formattedLatitude, formattedLongitude)

    formattedObservation[FAMILY] = family
    formattedObservation[SCIENTIFIC_NAME] = scientificName
    formattedObservation[INATURALIST_URL] = observation['uri'] ?? ''

    // Darwin Core fields
    formattedObservation[CITATION] = `Oregon Bee Atlas ${year}. Oregon State University, Corvallis, OR, USA.`
    formattedObservation[DATASET_NAME] = `OBA-OSAC-${year}`

    formattedObservation[RECORDED_BY] = `${firstName}${(firstName && lastName) ? ' ' : ''}${lastName}`

    formattedObservation[ASSOCIATED_TAXA] = (scientificName || family) ? `foraging on : "${scientificName || family}"` : ''

    formattedObservation[SAMPLING_PROTOCOL] = 'aerial net'

    formattedObservation[DARWIN_YEAR] = formattedYear
    formattedObservation[DARWIN_MONTH] = formattedMonth
    formattedObservation[DARWIN_DAY] = formattedDay
    formattedObservation[VERBATIM_DATE] = observation['observed_on_string'] ?? ''

    formattedObservation[FIELD_NOTES] = observation['description'] ?? ''

    formattedObservation[DARWIN_COUNTRY] = country
    formattedObservation[DARWIN_STATE] = stateProvince
    formattedObservation[DARWIN_COUNTY] = county
    formattedObservation[DARWIN_LOCATION] = formattedLocation

    formattedObservation[DARWIN_LATITUDE] = formattedLatitude
    formattedObservation[DARWIN_LONGITUDE] = formattedLongitude

    // Set error flags as a semicolon-separated list of fields (non-empty fields and additional flags)
    formattedObservation[ERROR_FLAGS] = nonEmptyFields.filter((field) => !formattedObservation[field]).concat(errorFields).join(';')

    return formattedObservation
}

/*
 * formatObservations()
 * Formats raw iNaturalist observations and duplicates them by the number of bees collected
 */
async function formatObservations(observations, year, updateFormattingProgress) {
    let formattedObservations = []

    let i = 0
    for (const observation of observations) {
        const formattedObservation = await formatObservation(observation, year)
        updateFormattingProgress(`${(100 * (i++) / observations.length).toFixed(2)}%`)

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

    // Iterate through the whole file (should yield before reading everything at once)
    let chunk = []
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
 * formatChunkRow()
 * Fully formats an observation object from a pre-existing row
 */
function formatChunkRow(row, year) {
    // The final field set should be a union of the standard template and the given row
    const formattedRow = Object.assign({}, observationTemplate, row)

    // A list of fields to flag in addition to the non-empty fields
    const errorFields = []

    // If the Darwin Core fields are empty, fill them from the labels fields
    formattedRow[CITATION] = row[CITATION] || `Oregon Bee Atlas ${year}. Oregon State University, Corvallis, OR, USA.`
    formattedRow[DATASET_NAME] = row[DATASET_NAME] || `OBA-OSAC-${year}`

    const firstName = row[FIRST_NAME]
    const lastName = row[LAST_NAME]
    formattedRow[RECORDED_BY] = row[RECORDED_BY] || `${firstName}${(firstName && lastName) ? ' ' : ''}${lastName}`

    const family = row[FAMILY]
    const scientificName = row[SCIENTIFIC_NAME]
    formattedRow[ASSOCIATED_TAXA] = row[ASSOCIATED_TAXA] || ((scientificName || family) ? `foraging on : "${scientificName || family}"` : '')

    const method = row[COLLECTION_METHOD] === 'net' ? 'aerial net' : row[COLLECTION_METHOD]
    formattedRow[SAMPLING_PROTOCOL] = row[SAMPLING_PROTOCOL] || method

    formattedRow[DARWIN_YEAR] = row[DARWIN_YEAR] || row[OBA_YEAR]
    formattedRow[DARWIN_MONTH] = row[DARWIN_MONTH] || monthNumerals.indexOf(row[OBA_MONTH]) + 1
    formattedRow[DARWIN_DAY] = row[DARWIN_DAY] || row[OBA_DAY]

    formattedRow[DARWIN_COUNTRY] = row[DARWIN_COUNTRY] || row[OBA_COUNTRY]
    formattedRow[DARWIN_STATE] = row[DARWIN_STATE] || row[OBA_STATE]

    // Flag OBA_COUNTRY and OBA_STATE if they have an unexpected value
    if (!Object.values(countryAbbreviations).includes(formattedRow[OBA_COUNTRY])) { errorFields.push(OBA_COUNTRY) }
    if (!Object.values(stateProvinceAbbreviations).includes(formattedRow[OBA_STATE])) { errorFields.push(OBA_STATE) }

    // Remove 'County' or 'Co' from the county field (case insensitive)
    const county = row[DARWIN_COUNTY] || row[OBA_COUNTY]
    formattedRow[DARWIN_COUNTY] = county.replace(countyRegex, '')

    formattedRow[DARWIN_LOCATION] = row[DARWIN_LOCATION] || row[OBA_ABBR_LOCATION]

    formattedRow[DARWIN_LATITUDE] = row[DARWIN_LATITUDE] || row[OBA_LATITUDE]
    formattedRow[DARWIN_LONGITUDE] = row[DARWIN_LONGITUDE] || row[OBA_LONGITUDE]

    // Flag ACCURACY if it is greater than 250 meters
    if (parseInt(formattedRow[ACCURACY]) > 250) { errorFields.push(ACCURACY) }

    // Flag OBA_LOCATION, OBA_ABBR_LOCATION, and DARWIN_LOCATION if they contain street suffixes, respectively
    if (includesStreetSuffix(formattedRow[OBA_LOCATION])) { errorFields.push(OBA_LOCATION) }
    if (includesStreetSuffix(formattedRow[OBA_ABBR_LOCATION])) { errorFields.push(OBA_ABBR_LOCATION) }
    if (includesStreetSuffix(formattedRow[DARWIN_LOCATION])) { errorFields.push(DARWIN_LOCATION) }

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
    const partitionSize = 50
    const nPartitions = Math.floor(observationIds.length / partitionSize) + 1
    let partitionStart = 0
    let partitionEnd = Math.min(partitionSize, observationIds.length)

    // Gather results until all partitions are complete
    let results = []
    for (let i = 0; i < nPartitions; i++) {
        const requestURL = `https://api.inaturalist.org/v1/observations/${observationIds.slice(partitionStart, partitionEnd).join(',')}`

        // Fetch and concatenate the data, catching errors
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

        // Update the partition markers
        partitionStart = partitionEnd
        partitionEnd = Math.min(partitionEnd + partitionSize, observationIds.length)
    }

    return results
}

/*
 * updateChunkRow()
 * Updates specific values (location and taxonomy) in a formatted row from its corresponding iNaturalist observation
 */
async function updateChunkRow(row, observation) {
    if (!row || !observation) { return }

    // Look up and update the plant taxonomy
    const family = getFamily(observation?.identifications) || row[FAMILY]
    const scientificName = observation?.taxon?.name || row[SCIENTIFIC_NAME]
    row[FAMILY] = family
    row[SCIENTIFIC_NAME] = scientificName
    row[ASSOCIATED_TAXA] = ((scientificName || family) ? `foraging on : "${scientificName || family}"` : '') || row[ASSOCIATED_TAXA]

    // Update the coordinate fields if any are missing or if the accuracy is better (smaller)
    const prevAccuracy = parseInt(row[ACCURACY])
    const newAccuracy = observation?.positional_accuracy
    if (
        !row[OBA_LATITUDE] ||
        !row[OBA_LONGITUDE] ||
        !row[DARWIN_LATITUDE] ||
        !row[DARWIN_LONGITUDE] ||
        (prevAccuracy && newAccuracy && newAccuracy < prevAccuracy)
    ) {
        const latitude = observation?.geojson?.coordinates?.at(1)?.toFixed(3)?.toString()
        const longitude = observation?.geojson?.coordinates?.at(0)?.toFixed(3)?.toString()

        row[OBA_LATITUDE] = latitude || row[OBA_LATITUDE]
        row[OBA_LONGITUDE] = longitude || row[OBA_LONGITUDE]
        row[ACCURACY] = newAccuracy?.toString() || row[ACCURACY]

        row[DARWIN_LATITUDE] = latitude || row[DARWIN_LATITUDE]
        row[DARWIN_LONGITUDE] = longitude || row[DARWIN_LONGITUDE]

        // Update the elevation in case the location changed
        row[ELEVATION] = await getElevation(latitude, longitude) || row[ELEVATION]
    }

    // Deconstruct, update, and reconstruct the ERROR_FLAGS field based on the new data
    let errorFlags = row[ERROR_FLAGS]?.split(';') || []
    const updatableFields = [
        FAMILY,
        SCIENTIFIC_NAME,
        ASSOCIATED_TAXA,
        OBA_LATITUDE,
        OBA_LONGITUDE,
        ACCURACY,
        DARWIN_LATITUDE,
        DARWIN_LONGITUDE,
        ELEVATION
    ]
    // Allow the flags of unupdated fields to pass and allow the flags of updated fields that are still empty to pass
    errorFlags = errorFlags.filter((field) => !updatableFields.includes(field) || !row[field])
    if (parseInt(row[ACCURACY]) > 250) { errorFlags.push(ACCURACY) }
    // Reconstruct the ERROR_FLAGS field
    row[ERROR_FLAGS] = errorFlags.join(';')
}

/*
 * formatChunk()
 * Formats and updates a chunk of pre-existing observation data
 */
async function formatChunk(chunk, year) {
    // Apply standard formatting
    const formattedChunk = chunk.map((row) => formatChunkRow(row, year))

    // Fetch the iNaturalist observations for rows that have an iNaturalist URL
    let observationIds = chunk
        .map((row) => row[INATURALIST_URL]?.split('/')?.pop())
        .filter((id) => !!id)
    observationIds = [...new Set(observationIds)]
    const observations = await fetchObservationsById(observationIds)

    // Update rows with the new data from iNaturalist
    for (const row of formattedChunk) {
        // Find the corresponding iNaturalist observation for the current row by matching the iNaturalist URL
        const matchingObservation = observations.find((observation) => observation['uri'] && (observation['uri'] === row[INATURALIST_URL]))
        // Update the row data
        await updateChunkRow(row, matchingObservation)
    }

    return formattedChunk
}

/*
 * isRowEmpty()
 * A boolean function that returns whether a row has all blank entries
 */
function isRowEmpty(row) {
    for (const field of Object.keys(row)) {
        if (row[field] && row[field] !== '') {
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
    // First, use iNaturalist URL, sample ID, and specimen ID
    // Then, use iNaturalist alias, collection day, month, and year, sample ID, and specimen ID
    let keyFields = []
    if (row[INATURALIST_URL] && row[SAMPLE_ID] && row[SPECIMEN_ID]) {
        keyFields = [INATURALIST_URL, SAMPLE_ID, SPECIMEN_ID]
    } else if (
        row[INATURALIST_ALIAS] &&
        row[SAMPLE_ID] &&
        row [SPECIMEN_ID] &&
        row[OBA_DAY] &&
        row[OBA_MONTH] &&
        row[OBA_YEAR]
    ) {
        keyFields = [INATURALIST_ALIAS, SAMPLE_ID, SPECIMEN_ID, OBA_DAY, OBA_MONTH, OBA_YEAR]
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

    try {
        const num1 = parseInt(str1)
        const num2 = parseInt(str2)
        return (num1 > num2) - (num1 < num2)
    } catch (err) {
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

    const month1 = monthNumerals.indexOf(row1[OBA_MONTH])
    const month2 = monthNumerals.indexOf(row2[OBA_MONTH])
    const monthComparison = (month1 > month2) - (month1 < month2)
    if (monthComparison !== 0) {
        return monthComparison
    }

    const dayComparison = compareNumericStrings(row1[OBA_DAY], row2[OBA_DAY])
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
        if (isRowEmpty(row)) {
            continue
        }

        if (row[OBSERVATION_NO]) {
            // Create a key for this row and add it to the set of seen keys
            const key = generateRowKey(row)
            seenKeys.add(key)
            // Add the row to the output
            uniqueRows.push(row)
        }
    }

    // Next, add other rows if they are unique
    for (const row of chunk) {
        if (isRowEmpty(row)) {
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
async function mergeTempFilesBatch(inputFiles, outputFile, compareRows) {
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
            const { value: firstRow, done } = await iterator.next()

            // If not at the end of the file, add the row to currentRows
            if (!done) {
                currentRows.push({
                    row: firstRow,
                    iterator
                })
            } else {
                currentRows.push({
                    row: null,
                    iterator
                })
            }
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

    // Repeatedly write the "minimum" row of currentRows to the output file until there are none left
    while (true) {
        // Record the index of each row within currentRows; filter out empty rows (e.g., from reaching the end of an open file)
        const validRows = currentRows
            .map((item, index) => ({
                row: item.row,
                index
            }))
            .filter((item) => item.row !== null)

        // Break the loop if there are no more rows
        if (validRows.length === 0) break

        // Find the row (in validRows) that has the minimum "value" using the given comparison function
        const minRow = validRows.reduce((min, current) => compareRows(current.row, min.row) < 0 ? current : min)

        // Write the minimum row to the output file
        stringifier.write(minRow.row)

        // Fetch the next row from the file which had the minimum row
        try {
            // Use the index in currentRows to get the iterator for the file that contained the minimum row; use the iterator to read the next row
            const { value: nextRow, done } = await currentRows[minRow.index].iterator.next()

            // Update currentRows to replace the minimum row with the next row, unless the end of the file was reached
            if (!done) {
                currentRows[minRow.index] = {
                    row: nextRow,
                    iterator: currentRows[minRow.index].iterator
                }
            } else {
                currentRows[minRow.index] = {
                    row: null,
                    iterator: currentRows[minRow.index].iterator
                }
            }
        } catch (error) {
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
async function mergeTempFiles(tempFiles, outputFilePath, compareRows) {
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
            await mergeTempFilesBatch(batch, outputFilePath, compareRows)
        } else {
            // Otherwise, merge into a new temporary file
            const mergedPath = path.join('./api/data/temp', `${Crypto.randomUUID()}.csv`)
            await mergeTempFilesBatch(batch, mergedPath, compareRows)
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
 * Searches through a given observations file for the largest observation number (and its index)
 */
async function findLastObservationNumber(filePath) {
    let lastObservationNumber = undefined
    let lastObservationNumberIndex = -1

    // Open a CSV parser for the given file path
    const { parser } = createParser(filePath)

    // Search linearly for the highest OBSERVATION_NO
    let i = 0
    for await (const row of parser) {
        if (row[OBSERVATION_NO]) {
            // Parse OBSERVATION_NO as an integer and update lastObservationNumber/lastObservationNumberIndex
            const currentObservationNumber = parseInt(row[OBSERVATION_NO])
            if (!isNaN(currentObservationNumber) && (!lastObservationNumber || currentObservationNumber > lastObservationNumber)) {
                lastObservationNumber = currentObservationNumber
                lastObservationNumberIndex = i
            }
        }
        i++
    }

    return { lastObservationNumber, lastObservationNumberIndex }
}

/*
 * indexData()
 * Automatically fills in the OBSERVATION_NO field for a given observations file
 */
async function indexData(filePath, year) {
    // Search for the highest observation number in the given file
    const { lastObservationNumber } = await findLastObservationNumber(filePath)

    // Construct a default observation number from the given year and from the current year; use the argument-based one first
    const argYearObservationNumber = year ? year.toString().slice(2) + '00000' : undefined
    const currentYearObservationNumber = (new Date()).getFullYear().toString().slice(2) + '00000'
    let nextObservationNumber = parseInt(argYearObservationNumber ?? currentYearObservationNumber)

    // If an observation number was found in the given file, set the next observation number to one greater
    nextObservationNumber = !isNaN(lastObservationNumber) ? lastObservationNumber + 1 : nextObservationNumber

    // Create an input CSV parser and an output stringifier for a temporary file
    const { parser } = createParser(filePath)

    const tempFilePath = `./api/data/temp/${Crypto.randomUUID()}.csv`
    const outputFileStream = fs.createWriteStream(tempFilePath, { encoding: 'utf-8' })
    const stringifier = stringify({ header: true, columns: Object.keys(observationTemplate) })
    stringifier.pipe(outputFileStream)

    // Add each non-empty row from the input file to the temporary output file; fill in the observation number if empty
    for await (const row of parser) {
        if (isRowEmpty(row)) continue

        if (!row[OBSERVATION_NO]) {
            row[OBSERVATION_NO] = String(nextObservationNumber)
            nextObservationNumber++
        }

        stringifier.write(row)
    }
    stringifier.end()

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
            if (msg) {
                const taskId = msg.content.toString()
                const task = await getTaskById(taskId)

                console.log(`Processing task ${taskId}...`)
                await updateTaskInProgress(taskId, { currentStep: 'Pulling observations from iNaturalist' })
                console.log('\tPulling observations from iNaturalist...')

                const observations = await pullObservations(task)

                await updateTaskInProgress(taskId, { currentStep: 'Updating place data' })
                console.log('\tUpdating place data...')

                await updatePlaces(observations)

                await updateTaskInProgress(taskId, { currentStep: 'Formatting new observations' })
                console.log('\tFormatting new observations...')

                const minDate = new Date(task.minDate)
                const year = minDate.getUTCFullYear()
                const formattedObservations = await formatObservations(observations, year, async (percentage) => {
                    await updateTaskInProgress(taskId, { currentStep: 'Formatting new observations', percentage })
                })

                await updateTaskInProgress(taskId, { currentStep: 'Formatting provided dataset' })
                console.log('\tFormatting provided dataset...')

                const inputFilePath = './api/data' + task.dataset.replace('/api', '')    // task.dataset has a '/api' suffix, which should be removed
                const outputFileName = `${Crypto.randomUUID()}.csv`
                const outputFilePath = './api/data/observations/' + outputFileName

                const seenKeys = new Set()
                const tempFiles = []

                // Separate the provided dataset into chunks and store them in temporary files; also, format and update the data
                for await (const chunk of readObservationsFileChunks(inputFilePath, CHUNK_SIZE)) {
                    const formattedChunk = await formatChunk(chunk, year)

                    const sortedChunk = sortAndDedupeChunk(formattedChunk, seenKeys)
                    if (sortedChunk) {
                        writeChunkToTempFile(sortedChunk, tempFiles)
                    }
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
                await mergeTempFiles(tempFiles, outputFilePath, compareRows)

                await updateTaskInProgress(taskId, { currentStep: 'Indexing merged data' })
                console.log('\tIndexing merged data...')

                await indexData(outputFilePath, year)

                await updateTaskResult(taskId, { uri: `/api/observations/${outputFileName}`, fileName: outputFileName })
                console.log('Completed task', taskId)

                limitFilesInDirectory('./api/data/observations', MAX_OBSERVATIONS)
                clearTasksWithoutFiles()

                clearDirectory('./api/data/elevation')
                clearDirectory('./api/data/temp')

                observationsChannel.ack(msg)
            }
        })
    } catch (err) {
        // console.error(err)
        throw err
    }
}

// Connect to the Mongo Server and Amazon S3 before running the main process
connectToDb().then(() => {
    connectToS3()
    main()
})