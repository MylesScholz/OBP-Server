import { delay } from '../utils/utilities.js'

class ApiService {
    constructor() {
        this.initialBackoffMs = 1000
        this.backoffLimitMs = 8000
        this.defaultPageSize = 200
    }

    async fetchUrl(url) {
        // Fetch and concatenate the data, catching errors
        try {
            // Make requests with exponential backoff to avoid API throttling
            for (let i = this.initialBackoffMs; i <= this.backoffLimitMs; i *= 2) {
                const response = await fetch(url)

                if (response.ok) {
                    return await response.json()
                } else if (response.status === 429) {    // 'Too Many Requests'
                    console.error(`Hit API request limit. Waiting ${i} milliseconds...`)
                    await delay(i)
                } else {
                    console.error(`Bad response while fetching '${url}':`, response)
                    break
                }
            }
        } catch (error) {
            console.error(`Error while fetching ${url}:`, error)
        }
    }

    async fetchUrlByIds(buildUrl, pageSize, ids, updateProgress) {
        await updateProgress(0)

        // ids can be a very long list, so batch requests to avoid iNaturalist API refusal
        const totalPages = Math.ceil(ids.length / pageSize)
        let pageStart = 0
        let pageEnd = Math.min(pageSize, ids.length)

        // Gather results until all pages are complete
        let results = []
        for (let i = 0; i < totalPages; i++) {
            const requestUrl = await buildUrl(ids.slice(pageStart, pageEnd).join(','))

            const response = await this.fetchUrl(requestUrl)
            results = results.concat(response['results'])

            // Increment page
            pageStart = pageEnd
            pageEnd = Math.min(pageEnd + pageSize, ids.length)

            await updateProgress(100 * (i + 1) / totalPages)
        }

        return results
    }

    async fetchUrlPages(url, updateProgress) {
        if (!url) return []
        
        await updateProgress(0)

        const pagedUrl = (page) => {
            const urlObj = new URL(url)
            const params = urlObj.searchParams

            urlObj.hostname = 'api.inaturalist.org'
            urlObj.pathname = '/v1/observations'

            params.delete('per_page')
            params.delete('page')

            params.set('per_page', '200')
            params.set('page', page ? page.toString() : '1')

            return urlObj.toString()
        }

        let response = await this.fetchUrl(pagedUrl(1))
        let results = response?.results ?? []

        const totalResults = parseInt(response?.total_results ?? '0')
        let totalPages = Math.ceil(totalResults / 200)

        await updateProgress(100 / totalPages)

        for (let i = 2; i <= totalPages; i++) {
            response = await this.fetchUrl(pagedUrl(i))
            results = results.concat(response?.results ?? [])
            await updateProgress(100 * i / totalPages)
        }

        return results
    }

    async fetchObservations(sourceId, minDate, maxDate, page = 1, pageSize = this.defaultPageSize) {
        const requestUrl = `https://api.inaturalist.org/v1/observations?project_id=${sourceId}&d1=${minDate}&d2=${maxDate}&per_page=${pageSize}&page=${page}`

        return await this.fetchUrl(requestUrl)
    }

    async fetchObservationsByIds(observationIds, updateProgress) {
        return await this.fetchUrlByIds(
            (ids) => `https://api.inaturalist.org/v1/observations?per_page=${200}&id=${ids}`,
            200,
            observationIds,
            updateProgress
        )
    }

    async fetchPlacesByIds(placeIds, updateProgress) {
        return await this.fetchUrlByIds(
            (ids) => `https://api.inaturalist.org/v1/places/${ids}`,
            200,
            placeIds,
            updateProgress
        )
    }

    async fetchTaxaByIds(taxaIds, updateProgress) {
        return await this.fetchUrlByIds(
            (ids) => `https://api.inaturalist.org/v1/taxa/${ids}`,
            30,
            taxaIds,
            updateProgress
        )
    }

    async *fetchObservationsBySourceChunks(sourceId, minDate, maxDate, updateProgress) {
        await updateProgress(0)

        let chunk = []
        const chunkSize = 5000

        // Break date range into 6-month partitions to avoid iNaturalist API search window restrictions
        const d1 = new Date(minDate + 'T12:00Z')    // Use noon GMT so every location is the same calendar date
        const d2 = new Date(maxDate + 'T12:00Z')

        let partitionStart = new Date(d1)
        let sixMonths = new Date(d1)
        sixMonths.setMonth(sixMonths.getMonth() + 6)
        sixMonths.setDate(sixMonths.getDate() - 1)  // Subtract one day to avoid overlapping partitions
        let partitionEnd = new Date(Math.min(d2, sixMonths))

        let totalPages = 0
        const partitions = []
        while (partitionStart <= d2) {
            // Format parition boundaries to iNaturalist query strings (YYYY-MM-DD)
            const partitionStartString = partitionStart.toISOString().slice(0, 10)
            const partitionEndString = partitionEnd.toISOString().slice(0, 10)

            // Fetch first page
            let response = await this.fetchObservations(sourceId, partitionStartString, partitionEndString, 1, 200)

            const observationCount = parseInt(response?.total_results ?? '0')
            const pageCount = Math.ceil(observationCount / 200)
            totalPages += pageCount
            partitions.push({
                start: partitionStart.toISOString().slice(0, 10),
                end: partitionEnd.toISOString().slice(0, 10),
                firstPage: response?.results ?? [],
                observationCount,
                pageCount
            })

            // Increment partition
            partitionStart = new Date(partitionEnd)
            partitionStart.setDate(partitionStart.getDate() + 1)    // Add one day to avoid overlapping partitions
            sixMonths = new Date(partitionStart)
            sixMonths.setMonth(sixMonths.getMonth() + 6)
            sixMonths.setDate(sixMonths.getDate() - 1)              // Subtract one day to avoid overlapping partitions
            partitionEnd = new Date(Math.min(d2, sixMonths))
        }

        let k = 0
        for (let i = 0; i < partitions.length; i++) {
            // Add first page of current partition to chunk
            chunk = chunk.concat(partitions[i].firstPage)
            // If the chunk is large enough, yield it and reset the chunk for the next call
            if (chunk.length >= chunkSize) {
                yield chunk
                chunk = []
            }

            await updateProgress(100 * (++k) / totalPages)

            for (let j = 2; j <= partitions[i].pageCount; j++) {
                const response = await this.fetchObservations(sourceId, partitions[i].start, partitions[i].end, j, 200)
                chunk = chunk.concat(response?.results ?? [])
                await updateProgress(100 * (++k) / totalPages)

                // If the chunk is large enough, yield it and reset the chunk for the next call
                if (chunk.length >= chunkSize) {
                    yield chunk
                    chunk = []
                }
            }
        }

        // Yield any remaining observations (a partial chunk)
        if (chunk.length > 0) {
            yield chunk
        }
    }
}

export default new ApiService()