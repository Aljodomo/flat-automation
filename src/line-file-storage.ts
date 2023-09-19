import fs from "fs";

export interface Repository<T> {
    add(key: T): Promise<void>;

    getAll(): Promise<T[]>;
}


export class LineFileStorage implements Repository<string> {

    fileName: string;

    constructor(fileName: string) {
        this.fileName = fileName;
        if (!fs.existsSync(this.fileName)) {
            fs.writeFileSync(this.fileName, "");
        }
    }

    add(line: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.appendFile(this.fileName, line + "\n", (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async getAll(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            fs.readFile(this.fileName, "utf8", (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data.split("\n"));
                }
            });
        });
    }
}
