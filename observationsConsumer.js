import amqp from 'amqplib'
import { fromFile } from 'geotiff'
import fs from 'fs'
import 'dotenv/config'

import { connectToDb } from './api/lib/mongo.js'
import { observationsQueueName } from './api/lib/rabbitmq.js'
import { getTaskById, updateTaskInProgress, updateTaskResult } from './api/models/task.js'

const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost'
const rabbitmqURL = `amqp://${rabbitmqHost}`

/* Formatting Constants */
const observationTemplate = {
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
    'taxonRank': '',
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
    'Det LR Best - Sex/Caste': ''       // sic
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
    const res = await fetch(`https://api.inaturalist.org/v1/observations?project_id=${sourceId}&d1=${minDate}&d2=${maxDate}&per_page=200&page=${page}`)
    return await res.json()
}

async function pullSourceObservations(sourceId, minDate, maxDate) {
    let response = await fetchObservations(sourceId, minDate, maxDate, 1)
    let results = response['results']

    const totalResults = parseInt(response['total_results'])
    let totalPages = Math.floor(totalResults / 200) + 1

    for (let i = 2; i < totalPages + 1; i++) {
        response = await fetchObservations(sourceId, minDate, maxDate, i)
        results = results.concat(response['results'])
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
    const res = await fetch(`https://api.inaturalist.org/v1/places/${places.join(',')}`)
    return await res.json()
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
        const res = await fetchPlaces(unknownPlaces)
        for (const newPlace of res['results']) {
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
        const row = 3601 - Math.floor(latitudeDecimalPart * rasters.height)     // Needs validation

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

    const observedDate = observation['time_observed_at'] ? new Date(observation['time_observed_at']) : undefined

    const observedDay = observedDate?.getDate()
    const observedMonth = observedDate?.getMonth()
    const observedYear = observedDate?.getFullYear()

    const timeFormatter = new Intl.DateTimeFormat('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    const formattedTime = observedDate ? timeFormatter.format(observedDate) : ''
    
    const formattedLocation = observation.place_guess?.split(', ')?.at(0) ?? ''
    const formattedLatitude = observation.geojson?.coordinates?.at(1)?.toFixed(3)?.toString() ?? ''
    const formattedLongitude = observation.geojson?.coordinates?.at(0)?.toFixed(3)?.toString() ?? ''

    // Formatting
    const formattedObservation = Object.assign({}, observationTemplate)

    formattedObservation['bibliographicCitation'] = `Oregon Bee Atlas ${year}. Oregon State University, Corvallis, OR, USA.`
    formattedObservation['datasetName'] = `OBA-OSAC-${year}`

    formattedObservation['recordedBy'] = `${firstName} ${lastName}`

    formattedObservation['associatedTaxa'] = `foraging on : "${scientificName !== '' ? scientificName : family}"`

    formattedObservation['year'] = observedYear?.toString() ?? ''
    formattedObservation['month'] = observedMonth?.toString() ?? ''
    formattedObservation['day'] = observedDay?.toString() ?? ''
    formattedObservation['verbatimEventDate'] = observation['time_observed_at'] ?? ''

    formattedObservation['fieldNotes'] = observation['description'] ?? ''

    formattedObservation['country'] = country
    formattedObservation['stateProvince'] = stateProvince
    formattedObservation['county'] = county
    formattedObservation['locality'] = formattedLocation

    formattedObservation['decimalLatitude'] = formattedLatitude
    formattedObservation['decimalLongitude'] = formattedLongitude

    formattedObservation['iNaturalist ID'] = observation.user?.id?.toString() ?? ''
    formattedObservation['iNaturalist Alias'] = observation.user?.login ?? ''

    formattedObservation['Collector - First Name'] = firstName
    formattedObservation['Collector - First Initial'] = firstInitial
    formattedObservation['Collector - Last Name'] = lastName

    formattedObservation['Sample ID'] = getOFV(observation['ofvs'], 'Sample ID.')
    formattedObservation['Specimen ID'] = getOFV(observation['ofvs'], 'Number of bees collected')

    formattedObservation['Collection Day 1'] = observedDay?.toString() ?? ''
    formattedObservation['Month 1'] = monthNumerals[observedMonth - 1] ?? ''
    formattedObservation['Year 1'] = observedYear?.toString() ?? ''
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

function writeObservationsFile(filePath, observations) {
    const header = Object.keys(observations[0])
    const headerRow = header.join(',')

    const csvRows = observations.map((observation) =>
        header.map((field) =>
            observation[field].includes(',') ? `"${observation[field]}"` : observation[field]
        ).join(',')
    )

    const csv = [headerRow, ...csvRows].join('\r\n')

    fs.writeFileSync(filePath, csv)
}

async function main() {
    try {
        await connectToDb()

        const connection = await amqp.connect(rabbitmqURL)
        const observationsChannel = await connection.createChannel()
        await observationsChannel.assertQueue(observationsQueueName)

        console.log(`Consuming queue '${observationsQueueName}'...`)
        observationsChannel.consume(observationsQueueName, async (msg) => {
            if (msg) {
                const taskId = msg.content.toString()
                const task = await getTaskById(taskId)

                console.log(`Processing task ${taskId}...`)
                updateTaskInProgress(taskId, { currentStep: 'Pulling observations from iNaturalist' })

                const observations = await pullObservations(task)

                updateTaskInProgress(taskId, { currentStep: 'Updating place data' })

                await updatePlaces(observations)

                updateTaskInProgress(taskId, { currentStep: 'Formatting new observations' })

                // TODO: parse year from minDate and maxDate
                const formattedObservations = await formatObservations(observations, '2024')

                // For now, output unmerged formatted observations
                writeObservationsFile('./api/data/formatTest.csv', formattedObservations)

                updateTaskInProgress(taskId, { currentStep: 'Merging new observations with provided dataset' })
                
                /* TODO: Merge new observations with task's dataset */

                updateTaskResult(taskId, { uri: '' })
                console.log('Completed task', taskId)
                observationsChannel.ack(msg)
            }
        })
    } catch (err) {
        console.error(err)
    }
}

main()