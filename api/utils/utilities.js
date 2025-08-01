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

export { includesStreetSuffix, getDayOfYear, delay, getOFV }