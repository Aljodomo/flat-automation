
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
        console.log(this.prefix + message, values)
    }

    warn(message: string, ...values: any[]): void {
        console.warn(this.prefix + message, values)
    }

    error(message: string, ...values: any[]): void {
        console.error(message, values)
    }
}
