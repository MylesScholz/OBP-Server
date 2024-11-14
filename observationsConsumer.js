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

const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost'
const rabbitmqURL = `amqp://${rabbitmqHost}`

/* Constants */

// Limit on the number of output files stored on the server
const MAX_OBSERVATIONS = 10
// Limit on the number of observations read from a file at once
const CHUNK_SIZE = 10000
// Number of temporary files to merge together at once
const BATCH_SIZE = 2
// Template object for observations; static values are provided as strings, data-dependent values are set to null
const observationTemplate = {
    'Error Flags': '',
    'Verified': '',
    'Date Added': '',
    'Date Label Print': '',
    'Date Label Sent': '',
    'Observation No.': '',
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

    county = county.replace(/(?<![^,.\s])Co(?:unty)?\.?(?![^,.\s])+/ig, '')
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

async function fetchElevationFile(fileKey) {
    const filePath = './api/data/' + fileKey

    if (!fs.existsSync(filePath)) {
        const fileStream = await getS3Object('obp-server-data', fileKey)
        const fileData = await fileStream.transformToByteArray()

        fs.writeFileSync(filePath, fileData)
    }
}

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
        // Fetch the given file from AWS S3
        await fetchElevationFile(fileKey)

        // Read the given file's raster data using the geotiff package
        const tiff = await fromFile('./api/data/' + fileKey)
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
        formattedObservation['Error Flags'] = nonEmptyFields.filter((field) => !formattedObservation[field]).join(';')

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
    const formattedLocation = observation.place_guess?.split(/,\s*/)?.at(0)?.replace(/(?<![^,.\s])Co(?:unty)?\.?(?![^,.\s])+/ig, '') ?? ''

    // Format the coordinates
    const formattedLatitude = observation.geojson?.coordinates?.at(1)?.toFixed(3)?.toString() ?? ''
    const formattedLongitude = observation.geojson?.coordinates?.at(0)?.toFixed(3)?.toString() ?? ''

    // A list of fields to flag
    const errorFields = []

    /* Final formatting */

    // Label fields
    formattedObservation['iNaturalist ID'] = observation.user?.id?.toString() ?? ''
    formattedObservation['iNaturalist Alias'] = observation.user?.login ?? ''

    formattedObservation['Collector - First Name'] = firstName
    formattedObservation['Collector - First Initial'] = firstInitial
    formattedObservation['Collector - Last Name'] = lastName

    formattedObservation['Sample ID'] = getOFV(observation['ofvs'], 'Sample ID.')
    formattedObservation['Specimen ID'] = getOFV(observation['ofvs'], 'Number of bees collected')

    formattedObservation['Collection Day 1'] = formattedDay
    formattedObservation['Month 1'] = monthNumerals[observedMonth] ?? ''
    formattedObservation['Year 1'] = formattedYear
    formattedObservation['Time 1'] = formattedTime

    formattedObservation['Country'] = countryAbbreviations[country] ?? country
    formattedObservation['State'] = stateProvinceAbbreviations[stateProvince] ?? stateProvince
    formattedObservation['County'] = county

    // Flag 'Country' and 'State' if they have an unexpected value
    if (!countryAbbreviations[country]) { errorFields.push('Country') }
    if (!stateProvinceAbbreviations[stateProvince]) { errorFields.push('State') }

    formattedObservation['Location'] = formattedLocation
    formattedObservation['Abbreviated Location'] = formattedLocation

    // Flag 'Location', 'Abbreviated Location', and 'locality' if formattedLocation contains any street suffixes
    if (includesStreetSuffix(formattedLocation)) {
        errorFields.push('Location')
        errorFields.push('Abbreviated Location')
        errorFields.push('locality')
    }

    formattedObservation['Dec. Lat.'] = formattedLatitude
    formattedObservation['Dec. Long.'] = formattedLongitude
    formattedObservation['Lat/Long Accuracy'] = observation.positional_accuracy?.toString() ?? ''

    // Flag 'Lat/Long Accuracy' if positional_accuracy is greater than 250 meters
    if (observation.positional_accuracy > 250) { errorFields.push('Lat/Long Accuracy') }

    formattedObservation['Elevation'] = await getElevation(formattedLatitude, formattedLongitude)

    formattedObservation['Associated plant - family'] = family
    formattedObservation['Associated plant - genus, species'] = scientificName
    formattedObservation['Associated plant - Inaturalist URL'] = observation['uri'] ?? ''

    // Darwin Core fields
    formattedObservation['bibliographicCitation'] = `Oregon Bee Atlas ${year}. Oregon State University, Corvallis, OR, USA.`
    formattedObservation['datasetName'] = `OBA-OSAC-${year}`

    formattedObservation['recordedBy'] = `${firstName}${(firstName && lastName) ? ' ' : ''}${lastName}`

    formattedObservation['associatedTaxa'] = (scientificName || family) ? `foraging on : "${scientificName || family}"` : ''

    formattedObservation['samplingProtocol'] = 'aerial net'

    formattedObservation['year'] = formattedYear
    formattedObservation['month'] = formattedMonth
    formattedObservation['day'] = formattedDay
    formattedObservation['verbatimEventDate'] = observation['observed_on_string'] ?? ''

    formattedObservation['fieldNotes'] = observation['description'] ?? ''

    formattedObservation['country'] = country
    formattedObservation['stateProvince'] = stateProvince
    formattedObservation['county'] = county
    formattedObservation['locality'] = formattedLocation

    formattedObservation['decimalLatitude'] = formattedLatitude
    formattedObservation['decimalLongitude'] = formattedLongitude

    // Set error flags as a semicolon-separated list of fields (empty fields and additional flags)
    formattedObservation['Error Flags'] = nonEmptyFields.filter((field) => !formattedObservation[field]).concat(errorFields).join(';')

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

        // 'Specimen ID' is initially set to the number of bees collected
        // Now, duplicate observations a number of times equal to this value and overwrite 'Specimen ID' to index the duplications
        if (formattedObservation['Specimen ID'] !== '') {
            try {
                const beesCollected = parseInt(formattedObservation['Specimen ID'])

                for (let i = 1; i < beesCollected + 1; i++) {
                    const duplicateObservation = Object.assign({}, formattedObservation)
                    duplicateObservation['Specimen ID'] = i.toString()

                    formattedObservations.push(duplicateObservation)
                }
            } catch (err) {
                formattedObservations.push(formattedObservation)
            }
        }
    }

    return formattedObservations
}

async function* readObservationsFileChunks(filePath, chunkSize) {
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' })
    const parser = parse({ columns: true, skip_empty_lines: true, relax_quotes: true })
    const csvStream = fileStream.pipe(parser)

    let chunk = []

    for await (const row of csvStream) {
        chunk.push(row)

        if (chunk.length >= chunkSize) {
            yield chunk
            chunk = []
        }
    }

    if (chunk.length > 0) {
        yield chunk
    }
}

function formatChunkRow(row, year) {
    // The final field set should be a union of the standard template and the given row
    const formattedRow = Object.assign({}, observationTemplate, row)

    // A list of fields to flag
    const errorFields = []

    // If the Darwin Core fields are empty, fill them from the labels fields
    formattedRow['bibliographicCitation'] = row['bibliographicCitation'] || `Oregon Bee Atlas ${year}. Oregon State University, Corvallis, OR, USA.`
    formattedRow['datasetName'] = row['datasetName'] || `OBA-OSAC-${year}`

    const firstName = row['Collector - First Name']
    const lastName = row['Collector - Last Name']
    formattedRow['recordedBy'] = row['recordedBy'] || `${firstName}${(firstName && lastName) ? ' ' : ''}${lastName}`

    const family = row['Associated plant - family']
    const scientificName = row['Associated plant - genus, species']
    formattedRow['associatedTaxa'] = row['associatedTaxa'] || ((scientificName || family) ? `foraging on : "${scientificName || family}"` : '')

    const method = row['Collection method'] === 'net' ? 'aerial net' : row['Collection method']
    formattedRow['samplingProtocol'] = row['samplingProtocol'] || method

    formattedRow['year'] = row['year'] || row['Year 1']
    formattedRow['month'] = row['month'] || monthNumerals.indexOf(row['Month 1']) + 1
    formattedRow['day'] = row['day'] || row['Collection Day 1']

    formattedRow['country'] = row['country'] || row['Country']
    formattedRow['stateProvince'] = row['stateProvince'] || row['State']

    if (!Object.values(countryAbbreviations).includes(formattedRow['Country'])) { errorFields.push('Country') }
    if (!Object.values(stateProvinceAbbreviations).includes(formattedRow['State'])) { errorFields.push('State') }

    const county = row['county'] || row['County']
    formattedRow['county'] = county.replace(/(?<![^,.\s])Co(?:unty)?\.?(?![^,.\s])+/ig, '')

    formattedRow['locality'] = row['locality'] || row['Abbreviated Location']

    formattedRow['decimalLatitude'] = row['decimalLatitude'] || row['Dec. Lat.']
    formattedRow['decimalLongitude'] = row['decimalLongitude'] || row['Dec. Long.']

    if (parseInt(formattedRow['Lat/Long Accuracy']) > 250) { errorFields.push('Lat/Long Accuracy') }

    if (includesStreetSuffix(formattedRow['Location'])) { errorFields.push('Location') }
    if (includesStreetSuffix(formattedRow['Abbreviated Location'])) { errorFields.push('Abbreviated Location') }
    if (includesStreetSuffix(formattedRow['locality'])) { errorFields.push('locality') }

    // Set error flags as a semicolon-separated list of empty fields
    formattedRow['Error Flags'] = nonEmptyFields.filter((field) => !formattedRow[field]).concat(errorFields).join(';')

    return formattedRow
}

async function fetchObservationsById(observationIds) {
    // observationIds can be a very long list of IDs, so batch requests to avoid iNaturalist API refusal
    const partitionSize = 50
    const nPartitions = Math.floor(observationIds.length / partitionSize) + 1
    let partitionStart = 0
    let partitionEnd = Math.min(partitionSize, observationIds.length)

    let results = []
    for (let i = 0; i < nPartitions; i++) {
        const requestURL = `https://api.inaturalist.org/v1/observations/${observationIds.slice(partitionStart, partitionEnd).join(',')}`

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
        partitionEnd = Math.min(partitionEnd + partitionSize, observationIds.length)
    }

    return results
}

async function updateChunkRow(row, observation) {
    // Look up and update the plant taxonomy
    const family = getFamily(observation?.identifications) || row['Associated plant - family']
    const scientificName = observation?.taxon?.name || row['Associated plant - genus, species']
    row['Associated plant - family'] = family
    row['Associated plant - genus, species'] = scientificName
    row['associatedTaxa'] = ((scientificName || family) ? `foraging on : "${scientificName || family}"` : '') || row['associatedTaxa']

    // Update the coordinate fields if any are missing or if the accuracy is better (smaller)
    const prevAccuracy = parseInt(row['Lat/Long Accuracy'])
    const newAccuracy = observation?.positional_accuracy
    if (
        !row['Dec. Lat.'] ||
        !row['Dec. Long.'] ||
        (prevAccuracy && newAccuracy && newAccuracy < prevAccuracy)
    ) {
        const latitude = observation?.geojson?.coordinates?.at(1)?.toFixed(3)?.toString()
        const longitude = observation?.geojson?.coordinates?.at(0)?.toFixed(3)?.toString()

        row['Dec. Lat.'] = latitude || row['Dec. Lat.']
        row['Dec. Long.'] = longitude || row['Dec. Long.']
        row['Lat/Long Accuracy'] = newAccuracy?.toString() || row['Lat/Long Accuracy']

        row['decimalLatitude'] = latitude || row['Dec. Lat.']
        row['decimalLongitude'] = longitude || row['Dec. Long.']

        row['Elevation'] = await getElevation(latitude, longitude) || row['Elevation']
    }

    let errorFlags = row['Error Flags']?.split(';') || []
    const updatableFields = [
        'Associated plant - family',
        'Associated plant - genus, species',
        'associatedTaxa',
        'Dec. Lat.',
        'Dec. Long.',
        'Lat/Long Accuracy',
        'decimalLatitude',
        'decimalLongitude',
        'Elevation'
    ]
    errorFlags = errorFlags.filter((field) => !updatableFields.includes(field) || !row[field])
    if (parseInt(row['Lat/Long Accuracy']) > 250) { errorFlags.push('Lat/Long Accuracy') }

    row['Error Flags'] = errorFlags.join(';')
}

async function formatChunk(chunk, year) {
    const formattedChunk = chunk.map((row) => formatChunkRow(row, year))

    let observationIds = chunk
        .map((row) => row['Associated plant - Inaturalist URL']?.split('/')?.pop())
        .filter((id) => !!id)
    observationIds = [...new Set(observationIds)]
    const observations = await fetchObservationsById(observationIds)

    for (const row of formattedChunk) {
        const matchingObservation = observations.find((observation) => observation['uri'] && (observation['uri'] === row['Associated plant - Inaturalist URL']))
        await updateChunkRow(row, matchingObservation)
    }

    return formattedChunk
}

function isRowEmpty(row) {
    for (const field of Object.keys(row)) {
        if (row[field] && row[field] !== '') {
            return false
        }
    }
    return true
}

function generateRowKey(row) {
    const urlField = 'Associated plant - Inaturalist URL'
    const sampleIDField = 'Sample ID'
    const specimenIDField = 'Specimen ID'
    const aliasField = 'iNaturalist Alias'
    const collectionDayField = 'Collection Day 1'
    const collectionMonthField = 'Month 1'
    const collectionYearField = 'Year 1'

    let keyFields = []
    if (row[urlField] && row[sampleIDField] && row[specimenIDField]) {
        keyFields = [urlField, sampleIDField, specimenIDField]
    } else if (
        row[aliasField] &&
        row[sampleIDField] &&
        row [specimenIDField] &&
        row[collectionDayField] &&
        row[collectionMonthField] &&
        row[collectionYearField]
    ) {
        keyFields = [aliasField, sampleIDField, specimenIDField, collectionDayField, collectionMonthField, collectionYearField]
    }

    const keyValues = keyFields.map((field) => String(row[field] || ''))

    const compositeKey = Crypto.createHash('sha256')
        .update(keyValues.join(','))
        .digest('hex')
    
    return compositeKey
}

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

function compareRows(row1, row2) {
    const observationNumberComparison = compareNumericStrings(row1['Observation No.'], row2['Observation No.'])
    if (observationNumberComparison !== 0) {
        return observationNumberComparison
    }

    const lastNameComparison = compareStrings(row1['Collector - Last Name'], row2['Collector - Last Name'])
    if (lastNameComparison !== 0) {
        return lastNameComparison
    }

    const firstNameComparison = compareStrings(row1['Collector - First Name'], row2['Collector - First Name'])
    if (firstNameComparison !== 0) {
        return firstNameComparison
    }

    const month1 = monthNumerals.indexOf(row1['Month 1'])
    const month2 = monthNumerals.indexOf(row2['Month 1'])
    const monthComparison = (month1 > month2) - (month1 < month2)
    if (monthComparison !== 0) {
        return monthComparison
    }

    const dayComparison = compareNumericStrings(row1['Collection Day 1'], row2['Collection Day 1'])
    if (dayComparison !== 0) {
        return dayComparison
    }

    const sampleIDComparison = compareNumericStrings(row1['Sample ID'], row2['Sample ID'])
    if (sampleIDComparison !== 0) {
        return sampleIDComparison
    }

    const specimenIDComparison = compareNumericStrings(row1['Specimen ID'], row2['Specimen ID'])
    if (specimenIDComparison !== 0) {
        return specimenIDComparison
    }

    return 0
}

function sortAndDedupeChunk(chunk, seenKeys) {
    const uniqueRows = []

    for (const row of chunk) {
        if (isRowEmpty(row)) {
            continue
        }

        if (row['Observation No.']) {
            const key = generateRowKey(row)
            seenKeys.add(key)
            uniqueRows.push(row)
        }
    }

    for (const row of chunk) {
        if (isRowEmpty(row)) {
            continue
        }

        const key = generateRowKey(row)
        if (!seenKeys.has(key)) {
            seenKeys.add(key)
            uniqueRows.push(row)
        }
    }

    return uniqueRows.sort(compareRows)
}

function writeObservationsFile(filePath, observations) {
    const header = Object.keys(observationTemplate)
    const csv = stringifySync(observations, { header: true, columns: header })

    fs.writeFileSync(filePath, csv)
}

function writeChunkToTempFile(chunk, tempFiles) {
    const tempFileName = `${Crypto.randomUUID()}.csv`
    const tempFilePath = path.join('./api/data/temp/', tempFileName)
    tempFiles.push(tempFilePath)

    writeObservationsFile(tempFilePath, chunk)

    return tempFilePath
}

function createParser(filePath) {
    const stream = fs.createReadStream(filePath, { encoding: 'utf-8' })
    const parser = stream.pipe(parse({ columns: true, skip_empty_lines: true, relax_quotes: true }))

    return { stream, parser }
}

async function mergeTempFilesBatch(inputFiles, outputFile, compareRows) {
    const readers = []
    const currentRows = []

    for (const filePath of inputFiles) {
        try {
            const { stream, parser } = createParser(filePath)
            readers.push({ stream, parser })
            
            const iterator = parser[Symbol.asyncIterator]()
            const { value: firstRow, done } = await iterator.next()

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
            console.error(`Error opening file ${filePath}`)
            readers.forEach(({ stream }) => stream.destroy())
            throw error
        }
    }

    const outputFileStream = fs.createWriteStream(outputFile, { encoding: 'utf-8' })
    const stringifier = stringify({ header: true, columns: Object.keys(observationTemplate) })
    stringifier.pipe(outputFileStream)

    while (true) {
        const validRows = currentRows
            .map((item, index) => ({
                row: item.row,
                index
            }))
            .filter((item) => item.row !== null)

        if (validRows.length === 0) break

        const minRow = validRows.reduce((min, current) => compareRows(current.row, min.row) < 0 ? current : min)

        stringifier.write(minRow.row)

        try {
            const { value: nextRow, done } = await currentRows[minRow.index].iterator.next()

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
            currentRows[minRow.index] = {
                row: null,
                iterator: currentRows[minRow.index].iterator
            }
        }
    }

    stringifier.end()
    readers.forEach(({ stream }) => stream.destroy())
}

async function mergeTempFiles(tempFiles, outputFilePath, compareRows) {
    if (!tempFiles) return

    const filesQueue = [...tempFiles]

    while (filesQueue.length > 0) {
        // console.log("\t\tMerge queue:" + " X".repeat(filesQueue.length))

        const batch = filesQueue.splice(0, BATCH_SIZE)

        if (filesQueue.length === 0 && batch.length === tempFiles.length) {
            await mergeTempFilesBatch(batch, outputFilePath, compareRows)
        } else {
            const mergedPath = path.join('./api/data/temp', `${Crypto.randomUUID()}.csv`)
            await mergeTempFilesBatch(batch, mergedPath, compareRows)
            filesQueue.push(mergedPath)
            tempFiles.push(mergedPath)
        }

        for (const filePath of batch) {
            fs.rmSync(filePath)
            tempFiles.splice(tempFiles.indexOf(filePath), 1)
        }
    }
}

async function findLastObservationNumber(filePath) {
    let lastObservationNumber = undefined
    let lastObservationNumberIndex = -1
    const { parser } = createParser(filePath)

    let i = 0
    for await (const row of parser) {
        if (row['Observation No.']) {
            const currentObservationNumber = parseInt(row['Observation No.'])
            if (!isNaN(currentObservationNumber) && (!lastObservationNumber || currentObservationNumber > lastObservationNumber)) {
                lastObservationNumber = currentObservationNumber
                lastObservationNumberIndex = i
            }
        }
        i++
    }

    return { lastObservationNumber, lastObservationNumberIndex }
}

async function indexData(filePath, year) {
    const { lastObservationNumber, lastObservationNumberIndex } = await findLastObservationNumber(filePath)

    const argYearObservationNumber = year ? year.toString().slice(2) + '00000' : undefined
    const currentYearObservationNumber = (new Date()).getFullYear().toString().slice(2) + '00000'
    let nextObservationNumber = parseInt(argYearObservationNumber ?? currentYearObservationNumber)

    nextObservationNumber = !isNaN(lastObservationNumber) ? lastObservationNumber + 1 : nextObservationNumber

    const { parser } = createParser(filePath)

    const tempFilePath = `./api/data/temp/${Crypto.randomUUID()}.csv`
    const outputFileStream = fs.createWriteStream(tempFilePath, { encoding: 'utf-8' })
    const stringifier = stringify({ header: true, columns: Object.keys(observationTemplate) })
    stringifier.pipe(outputFileStream)

    for await (const row of parser) {
        if (isRowEmpty(row)) continue

        if (!row['Observation No.']) {
            row['Observation No.'] = String(nextObservationNumber)
            nextObservationNumber++
        }

        stringifier.write(row)
    }
    stringifier.end()

    fs.renameSync(tempFilePath, filePath)
}

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

                for await (const chunk of readObservationsFileChunks(inputFilePath, CHUNK_SIZE)) {
                    const formattedChunk = await formatChunk(chunk, year)

                    const sortedChunk = sortAndDedupeChunk(formattedChunk, seenKeys)
                    if (sortedChunk) {
                        writeChunkToTempFile(sortedChunk, tempFiles)
                    }
                }

                await updateTaskInProgress(taskId, { currentStep: 'Merging new observations with provided dataset' })
                console.log('\tMerging new observations with provided dataset...')

                if (formattedObservations.length > 0) {
                    const sortedChunk = sortAndDedupeChunk(formattedObservations, seenKeys)
                    if (sortedChunk) {
                        writeChunkToTempFile(sortedChunk, tempFiles)
                    }
                }

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

connectToDb().then(() => {
    connectToS3()
    main()
})