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
                    console.error(`Bad response while fetching '${requestUrl}':`, response)
                    break
                }
            }
        } catch (error) {
            console.error(`Error while fetching ${requestUrl}:`, error)
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

    async fetchSourceObservations(sourceId, minDate, maxDate, updateProgress) {
        await updateProgress(0)

        let response = await this.fetchObservations(sourceId, minDate, maxDate, 1, 200)
        let results = response?.results ?? []

        const totalResults = parseInt(response?.total_results ?? '0')
        let totalPages = Math.ceil(totalResults / 200)

        await updateProgress(100 / totalPages)

        for (let i = 2; i < totalPages + 1; i++) {
            response = await this.fetchObservations(sourceId, minDate, maxDate, i, 200)
            results = results.concat(response?.results ?? [])
            await updateProgress(100 * i / totalPages)
        }

        return results
    }
}

export default new ApiService()