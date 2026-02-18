import { fieldNames, sortConfig } from './constants.js'

/*
 * includesStreetSuffix()
 * A boolean function that returns whether a given string contains a street suffix (Road, Rd, Street, St, etc.)
 */
function includesStreetSuffix(string) {
    if (!string || typeof string !== 'string') { return false }
    // A list of RegExps to detect street suffixes
    const streetSuffixRegexes = [
        'R(?:oa)?d',                    // Road, Rd
        'St(?:r(?:eet)?)?',             // Street, Str, St
        'Av(?:e(?:nue)?)?',             // Avenue, Ave, Av
        'Dr(?:ive)?',                   // Drive, Dr
        'Blvd|Boulevard',               // Boulevard, Blvd
        'C(?:our)?t',                   // Court, Ct
        'Ln|Lane'                       // Lane, Ln
    ].map((regex) => new RegExp(`(?<![^,.\\s])${regex}(?![^,.\\s])`, 'i'))

    return streetSuffixRegexes.some((regex) => regex.test(string))
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
 * delay()
 * Returns a Promise that resolves after a given number of milliseconds
 */
function delay(mSec) {
    return new Promise(resolve => setTimeout(resolve, mSec))
}

/*
 * getOFV()
 * Looks up the value of an iNaturalist observation field by name
 */
function getOFV(ofvs, fieldName) {
    const ofv = ofvs?.find((field) => field.name === fieldName)
    return ofv?.value ?? ''
}

/*
 * parseQueryParameters()
 * Parses API query parameters into a valid database query
 */
function parseQueryParameters(query, adminId) {
    const params = {
        page: 1,
        pageSize: 50,
        filter: {},
        projection: {
            composite_sort: 0,
            date: 0,
            new: 0,
            scratch: 0
        },
        sortConfig: [ { field: 'composite_sort', direction: 1, type: 'string' } ]
    }

    // Non-admins must query a single userLogin value
    const userLoginQuery = query[fieldNames.iNaturalistAlias]
    if (!adminId && (!userLoginQuery || userLoginQuery.split(',').length > 1)) {
        params.error = {
            status: 401,
            message: 'Unauthorized requests must query a single userLogin'
        }
    }

    // Parse query parameters

    // Fuzzy field number search parameter
    if (query.q) {
        params.filter[fieldNames.fieldNumber] = { $regex: `^${query.q}.*` }
    }

    // Pagination parameters
    const parsedPage = parseInt(query.page)
    if (query.page && !isNaN(parsedPage)) {
        params.page = parsedPage
    }

    const parsedPerPage = parseInt(query.per_page)
    if (query.per_page && !isNaN(parsedPerPage)) {
        params.pageSize = Math.min(parsedPerPage, 5000)     // Limit page size to 5000
    }

    // Date parameters
    const startDate = new Date(query.start_date ?? '')
    const endDate = new Date(query.end_date ?? '')
    if (startDate > endDate) {
        params.error = {
            status: 400,
            message: 'start_date must be before end_date'
        }
        return params
    }
    if (startDate.toString() !== 'Invalid Date') {
        if (!params.filter.date) params.filter.date = {}
        
        // Set time to noon UTC to avoid location-based date variance
        startDate.setHours(12, 0, 0, 0)
        params.filter.date.$gte = startDate
    }
    if (endDate.toString() !== 'Invalid Date') {
        if (!params.filter.date) params.filter.date = {}

        // Set time to noon UTC to avoid location-based date variance
        endDate.setHours(12, 0, 0, 0)
        params.filter.date.$lte = endDate
    }

    // Parse field names directly included in the query object
    const queryFields = Object.values(fieldNames).filter((fieldName) => !!query[fieldName] || query[fieldName] === '')
    for (const queryField of queryFields) {
        if (query[queryField] === '(empty)') {
            // The query value '(empty)' is reserved for empty value queries
            params.filter[queryField] = { $in: [ null, '' ] }
        } else if (query[queryField] === '(non-empty)') {
            // The query value '(non-empty)' is reserved for non-empty value queries
            params.filter[queryField] = { $exists: true, $nin: [ null, '' ] }
        } else {
            // Comma-separated multi-value queries
            params.filter[queryField] = { $in: query[queryField].split(',') }
        }
    }

    // Sorting parameters
    if (query.sort_by === 'fieldNumber') {
        const direction = query.sort_dir === 'desc' ? -1 : 1
        params.sortConfig = [ { field: 'composite_sort', direction } ]
    } else if (query.sort_by === 'date') {
        const direction = query.sort_dir === 'desc' ? -1 : 1
        // Sort by date, then default
        params.sortConfig = [
            { field: 'date', direction },
            { field: 'composite_sort', direction: 1 }
        ]
    }

    return params
}

export { includesStreetSuffix, getDayOfYear, delay, getOFV, parseQueryParameters }