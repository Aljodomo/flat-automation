
export interface Logger {
    log(message: string, ...values: any[]): void
    warn(message: string, ...values: any[]): void
    error(message: string, ...values: any[]): void
}

export class ConsoleLogger implements Logger {
    prefix: string;

    constructor(identifier: string) {
        this.prefix = `[${identifier}] `
    }

    log(message: string, ...values: any[]): void {
        if(values.length > 0) {
            console.log(this.prefix + message, values)
        } else {
            console.log(this.prefix + message)
        }
    }

    warn(message: string, ...values: any[]): void {
        if(values.length > 0) {
            console.warn(this.prefix + message, values)
        } else {
            console.warn(this.prefix + message)
        }
    }

    error(message: string, ...values: any[]): void {
        if(values.length > 0) {
            console.error(this.prefix + message, values)
        } else {
            console.error(this.prefix + message)
        }
    }
}
