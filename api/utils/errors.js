export class InvalidArgumentError extends Error {
    constructor(message) {
        super(message)
        this.name = 'InvalidArgumentError'
    }
}

export class ValidationError extends Error {
    constructor(message) {
        super(message)
        this.name = 'ValidationError'
    }
}