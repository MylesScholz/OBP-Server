export default class DeterminationsState {
    constructor(determinationsState) {
        this.data = [ ...(determinationsState?.data ?? []) ]
        this.fields = [
            'fieldNumber',
            'sampleId',
            'specimenId',
            'verbatimEventDate',
            'url',
            'familyVolDet',
            'genusVolDet',
            'speciesVolDet',
            'sexVolDet',
            'casteVolDet'
        ]

        if (this.data.length === 0) this.addBlankDeterminations(100)
    }

    getMaxKey() {
        return this.data.reduce((previous, current) => current.key > previous ? current.key : previous, -1)
    }

    findByKey(key) {
        return this.data.find((determination) => key === determination['key'])
    }

    addBlankDeterminations(number = 1) {
        const blankDetermination = {}
        this.fields.forEach((field) => blankDetermination[field] = '')

        const maxKey = this.getMaxKey()
        for (let i = maxKey + 1; i <= maxKey + number; i++) {
            const insert = Object.assign({}, blankDetermination, { key: i })
            this.data.push(insert)
        }
    }

    setFieldValueByKey(key, field, value) {
        const determination = this.data[key]
        if (!determination || !this.fields.includes(field)) return

        determination[field] = value

        return determination
    }
}