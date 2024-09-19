import Crypto from 'node:crypto'
import fs from 'fs'
import amqp from 'amqplib'
import { fromFile } from 'geotiff'
import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'
import 'dotenv/config'

import { connectToDb } from './api/lib/mongo.js'
import { observationsQueueName } from './api/lib/rabbitmq.js'
import { getTaskById, updateTaskInProgress, updateTaskResult } from './api/models/task.js'

const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost'
const rabbitmqURL = `amqp://${rabbitmqHost}`

/* Formatting Constants */
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
    'samplingProtocol': 'aerial net',
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
const countryAbbreviations = {
    'United States': 'USA',
    'Canada': 'CA'
}
const stateProvinceAbbreviations = {
    'Alabama': 'AL',                    // American States
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

async function pullObservations(task) {
    let observations = []

    for (const sourceId of task.sources) {
        observations = observations.concat(await pullSourceObservations(sourceId, task.minDate, task.maxDate))
    }

    return observations
}

function readPlacesFile() {
    const placesData = fs.readFileSync('./api/data/places.json')
    return JSON.parse(placesData)
}

function writePlacesFile(places) {
    fs.writeFileSync('./api/data/places.json', JSON.stringify(places))
}

async function fetchPlaces(places) {
    const partitionSize = 50
    const nPartitions = Math.floor(places.length / partitionSize) + 1
    let partitionStart = 0
    let partitionEnd = Math.min(partitionSize, places.length)

    const results = []
    for (let i = 0; i < nPartitions; i++) {
        const requestURL = `https://api.inaturalist.org/v1/places/${places.slice(partitionStart, partitionEnd).join(',')}`

        try {
            const res = await fetch(requestURL)
            if (res.ok) {
                const resJSON = await res.json()
                results.concat(resJSON['results'])
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

async function updatePlaces(observations) {
    const places = readPlacesFile()
    const unknownPlaces = []

    for (const observation of observations) {
        const placeIds = observation['place_ids']
        
        for (const placeId of placeIds) {
            if (!(placeId in places) && !unknownPlaces.includes(placeId)) {
                unknownPlaces.push(placeId)
            }
        }
    }

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

    writePlacesFile(places)
}

function readUsernamesFile() {
    const usernamesData = fs.readFileSync('./api/data/usernames.json')
    return JSON.parse(usernamesData)
}

function lookUpUserName(user) {
    let firstName = '', firstInitial = '', lastName = ''

    if (!user) {
        return { firstName, firstInitial, lastName }
    }

    const usernames = readUsernamesFile()

    const userLogin = user['login']
    const fullName = usernames[userLogin]?.split(' ')

    if (fullName) {
        firstName = fullName[0]
        firstInitial = firstName[0] + '.'
        lastName =  fullName.length > 1 ? fullName[fullName.length - 1] : ''
    }
    
    return { firstName, firstInitial, lastName }
}

function lookUpPlaces(placeIds) {
    let country = '', stateProvince = '', county = ''

    if (!placeIds) {
        return { country, stateProvince, county }
    }

    const places = readPlacesFile()

    for (const placeId of placeIds) {
        const place = places[placeId]

        if (place?.at(0) === '0') country = place[1] ?? ''
        if (place?.at(0) === '10') stateProvince = place[1] ?? ''
        if (place?.at(0) === '20') county = place[1] ?? ''
    }

    return { country, stateProvince, county }
}

function getOFV(ofvs, fieldName) {
    const ofv = ofvs?.find((field) => field['name'] === fieldName)
    return ofv?.value ?? ''
}

function getFamily(identifications) {
    if (!identifications) {
        return ''
    }

    for (const id of identifications) {
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

    return ''
}

async function readElevationFromFile(filePath, latitude, longitude) {
    try {
        const tiff = await fromFile(filePath)
        const image = await tiff.getImage()
        const rasters = await image.readRasters()
        const data = rasters[0]

        const latitudeDecimalPart = latitude - Math.floor(latitude)
        const row = Math.floor(latitudeDecimalPart * rasters.height)

        const longitudeDecimalPart = longitude - Math.floor(longitude)
        const column = Math.floor(longitudeDecimalPart * rasters.width)

        const elevation = data[column + rasters.width * row]
        return elevation?.toString() ?? ''
    } catch (err) {
        return ''
    }
}

async function getElevation(latitude, longitude) {
    if (latitude === '' || longitude === '') {
        return ''
    }

    let cardinalLatitude = latitude.split('.')[0]
    const degreesLatitude = parseInt(cardinalLatitude)
    let cardinalLongitude = longitude.split('.')[0]
    const degreesLongitude = parseInt(cardinalLongitude)

    if (degreesLatitude < 0) {
        cardinalLatitude = 's' + `${-degreesLatitude + 1}`
    } else {
        cardinalLatitude = 'n' + cardinalLatitude
    }

    if (degreesLongitude < 0) {
        cardinalLongitude = 'w' + `${-degreesLongitude + 1}`.padStart(3, '0')
    } else {
        cardinalLongitude = 'e' + cardinalLongitude.padStart(3, '0')
    }

    const filePath = `./api/data/elevation/${cardinalLatitude}_${cardinalLongitude}_1arc_v3.tif`

    if (!fs.existsSync(filePath)) {
        return ''
    }

    return await readElevationFromFile(filePath, parseFloat(latitude), parseFloat(longitude))
}

async function formatObservation(observation, year) {
    // Parse user name
    const { firstName, firstInitial, lastName } = lookUpUserName(observation['user'])

    // Parse location
    const { country, stateProvince, county } =  lookUpPlaces(observation['place_ids'])

    // Formatted fields as constants for re-use
    const family = getFamily(observation['identifications'])
    const scientificName = observation.taxon?.name ?? ''

    const observedDate = observation['observed_on_string'] ? new Date(observation['observed_on_string']) : undefined

    const observedDay = observedDate?.getDate()
    const observedMonth = observedDate?.getMonth()
    const observedYear = observedDate?.getFullYear()
    const observedHour = observedDate?.getHours()
    const observedMinute = observedDate?.getMinutes()

    const formattedDay = !isNaN(observedDay) ? observedDay.toString() : ''
    const formattedMonth = !isNaN(observedMonth) ? observedMonth.toString() : ''
    const formattedYear = !isNaN(observedYear) ? observedYear.toString() : ''
    const formattedHours  = !isNaN(observedHour) ? observedHour.toString().padStart(2, '0') : undefined
    const formattedMinutes = !isNaN(observedMinute) ? observedMinute.toString().padStart(2, '0') : undefined
    const formattedTime = formattedHours && formattedMinutes ? `${formattedHours}:${formattedMinutes}` : ''
    
    const formattedLocation = observation.place_guess?.split(', ')?.at(0) ?? ''
    const formattedLatitude = observation.geojson?.coordinates?.at(1)?.toFixed(3)?.toString() ?? ''
    const formattedLongitude = observation.geojson?.coordinates?.at(0)?.toFixed(3)?.toString() ?? ''

    // Formatting
    const formattedObservation = Object.assign({}, observationTemplate)

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

    formattedObservation['Location'] = formattedLocation
    formattedObservation['Abbreviated Location'] = formattedLocation

    formattedObservation['Dec. Lat.'] = formattedLatitude
    formattedObservation['Dec. Long.'] = formattedLongitude
    formattedObservation['Lat/Long Accuracy'] = observation.positional_accuracy?.toString() ?? ''

    formattedObservation['Elevation'] = await getElevation(formattedLatitude, formattedLongitude)

    formattedObservation['Associated plant - family'] = family
    formattedObservation['Associated plant - genus, species'] = scientificName
    formattedObservation['Associated plant - Inaturalist URL'] = observation['uri'] ?? ''

    formattedObservation['bibliographicCitation'] = `Oregon Bee Atlas ${year}. Oregon State University, Corvallis, OR, USA.`
    formattedObservation['datasetName'] = `OBA-OSAC-${year}`

    formattedObservation['recordedBy'] = `${firstName} ${lastName}`

    formattedObservation['associatedTaxa'] = scientificName !== '' || family !== '' ? `foraging on : "${scientificName !== '' ? scientificName : family}"` : ''

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

    return formattedObservation
}

async function formatObservations(observations, year) {
    let formattedObservations = []

    for (const observation of observations) {
        const formattedObservation = await formatObservation(observation, year)

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

function readObservationsFile(filePath) {
    const observationsBuffer = fs.readFileSync(filePath)
    const observations = parse(observationsBuffer, { columns: true })

    return observations
}

function equalIdentifiers(row1, row2) {
    if (!row1 || !row2) {
        return false
    }

    if (
        row1['Observation No.'] !== '' &&
        row1['Observation No.'] === row2['Observation No.']
    ) {
        return true
    } else if (
        row1['Associated plant - Inaturalist URL'] !== '' &&
        row1['Associated plant - Inaturalist URL'] === row2['Associated plant - Inaturalist URL'] &&
        row1['Sample ID'] === row2['Sample ID'] &&
        row1['Specimen ID'] === row2['Specimen ID']
    ) {
        return true
    } else if (
        row1['iNaturalist Alias'] === row2['iNaturalist Alias'] &&
        row1['Sample ID'] === row2['Sample ID'] &&
        row1['Specimen ID'] === row2['Specimen ID'] &&
        row1['Collection Day 1'] === row2['Collection Day 1'] &&
        row1['Month 1'] === row2['Month 1'] &&
        row1['Year 1'] === row2['Year 1']
    ) {
        return true
    }

    return false
}

function findRow(dataset, row) {
    if (!dataset || !row) {
        return -1
    }

    for (let i = 0; i < dataset.length; i++) {
        if (equalIdentifiers(dataset[i], row)) {
            return i
        }
    }

    return -1
}

function mergeData(baseDataset, newObservations) {
    const mergedData = baseDataset.slice(0)

    for (const observation of newObservations) {
        const index = findRow(mergedData, observation)

        if (index === -1) {
            mergedData.push(observation)
        } else {
            const header = Object.keys(observationTemplate)
            const identifyingFields = ['Observation No.', 'Associated plant - Inaturalist URL', 'iNaturalist Alias', 'Sample ID', 'Specimen ID', 'Collection Day 1', 'Month 1', 'Year 1']

            header.forEach((field) => {
                if (!mergedData[index][field]) {
                    mergedData[index][field] = ''
                } else if (observation[field] && observation[field] !== '' && !identifyingFields.includes(field)) {
                    mergedData[index][field] = observation[field]
                }
            })
        }
    }

    return mergedData
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

function isRowEmpty(row) {
    for (const field of Object.keys(row)) {
        if (row[field] && row[field] !== '') {
            return false
        }
    }
    return true
}

function indexData(dataset, year) {
    const sortedDataset = dataset.sort(compareRows)

    const argYearObservationNumber = year ? year.toString().slice(2) + '00000' : undefined
    const currentYearObservationNumber = (new Date()).getFullYear().toString().slice(2) + '00000'
    let nextObservationNumber = parseInt(argYearObservationNumber ?? currentYearObservationNumber)

    const lastObservationNumberIndex = sortedDataset.findLastIndex((row) => row['Observation No.'] && row['Observation No.'] !== '')
    if (sortedDataset[lastObservationNumberIndex]) {
        const lastObservationNumber = parseInt(sortedDataset[lastObservationNumberIndex]['Observation No.'])
        nextObservationNumber = !isNaN(lastObservationNumber) ? lastObservationNumber + 1 : nextObservationNumber
    }

    for (let i = lastObservationNumberIndex + 1; i < sortedDataset.length; i++) {
        if (!isRowEmpty(sortedDataset[i])) {
            sortedDataset[i]['Observation No.'] = nextObservationNumber.toString()
            nextObservationNumber++
        }
    }

    return sortedDataset
}

function writeObservationsFile(filePath, observations) {
    const header = Object.keys(observationTemplate)
    const csv = stringify(observations, { header: true, columns: header })

    fs.writeFileSync(filePath, csv)
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
                const formattedObservations = await formatObservations(observations, year)

                await updateTaskInProgress(taskId, { currentStep: 'Merging new observations with provided dataset' })
                console.log('\tMerging new observations with provided dataset...')
                
                const baseDataset = readObservationsFile('./api/data' + task.dataset)
                const mergedData = mergeData(baseDataset, formattedObservations)

                const indexedData = indexData(mergedData, year)

                await updateTaskInProgress(taskId, { currentStep: 'Writing updated dataset to file' })
                console.log('\tWriting updated dataset to file...')

                const resultFileName = `${Crypto.randomUUID()}.csv`
                writeObservationsFile(`./api/data/observations/${resultFileName}`, indexedData)

                await updateTaskResult(taskId, { uri: `/observations/${resultFileName}`, fileName: resultFileName })
                console.log('Completed task', taskId)
                observationsChannel.ack(msg)
            }
        })
    } catch (err) {
        // console.error(err)
        throw err
    }
}

connectToDb().then(async () => {
    main()
})