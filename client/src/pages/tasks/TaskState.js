export default class TaskState {
    constructor(taskState) {
        this.occurrences = !!taskState?.occurrences
        this.observations = !!taskState?.observations
        this.emails = !!taskState?.emails
        this.labels = !!taskState?.labels
        this.addresses = !!taskState?.addresses
        this.pivots = !!taskState?.pivots
        this.subtasks = [ 'occurrences', 'observations', 'emails', 'labels', 'addresses', 'pivots' ]
        this.subtaskIO = {
            'occurrences': {
                inputs: [ 'occurrences' ],
                outputs: [ 'occurrences', 'duplicates' ]
            },
            'observations': {
                inputs: [],
                outputs: [ 'occurrences', 'pulls', 'flags' ]
            },
            'emails': {
                inputs: [ 'flags' ],
                outputs: [ 'emails' ]
            },
            'labels': {
                inputs: [ 'occurrences', 'pulls' ],     // The first input file type will be treated as the default
                outputs: [ 'labels', 'flags' ]
            },
            'addresses': {
                inputs: [ 'occurrences', 'pulls' ],
                outputs: [ 'addresses' ]
            },
            'pivots': {
                inputs: [ 'occurrences', 'pulls' ],
                outputs: [ 'pivots' ]
            }
        }
        this.id = !!taskState?.id
    }

    getFirstSubtask() {
        for (const type of this.subtasks) {
            if (this[type]) {
                return type
            }
        }
    }

    getSubtaskOrdinal(subtaskType) {
        let i = 1
        for (const type of this.subtasks) {
            if (type === subtaskType) return i
            if (this[type]) i++
        }
    }

    getInputOptions(subtaskType) {
        // List of input types accepted by the given subtask
        const acceptedInputs = this.subtaskIO[subtaskType]?.inputs ?? []
        // List of available and accepted input options from previous subtasks
        const availableOptions = []

        // Loop through the previous enabled subtasks up to the given subtask
        for (const type of this.getEnabledSubtasks()) {
            if (type === subtaskType) break

            // List of outputs from the current subtask that are accepted by the given subtask
            const acceptedOutputs = this.subtaskIO[type].outputs.filter((output) => acceptedInputs.includes(output))

            // For each accepted output, create an object that uniquely describes it
            for (const output of acceptedOutputs) {
                const subtaskIndex = (this.getSubtaskOrdinal(type) - 1)
                const key = `${subtaskIndex}_${output}`
                availableOptions.push({ subtask: type, subtaskIndex, output, key })
            }
        }

        // Find the default input for the given subtask (the last output file matching the first accepted input file type of the given subtask)
        const defaultIndex = availableOptions.findLastIndex((option) => option.output === this.subtaskIO[subtaskType].inputs[0])
        if (defaultIndex !== -1) {
            availableOptions[defaultIndex].default = true
        }
        
        return availableOptions
    }

    getEnabledSubtasks() {
        return this.subtasks.filter((type) => !!this[type])
    }

    getDisabledSubtasks() {
        return this.subtasks.filter((type) => !this[type])
    }

    areAllEnabled() {
        return this.subtasks.every((type) => !!this[type])
    }

    areAllDisabled() {
        return this.subtasks.every((type) => !this[type])
    }    
}