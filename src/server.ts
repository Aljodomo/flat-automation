import { Page } from "puppeteer";
import { Repository } from "./line-file-storage.ts";
import { sendLog } from "./telegram.ts";

const getDefaultInterval = () => process.env.SPIDER_INTERVAL ? parseInt(process.env.SPIDER_INTERVAL) : 45000
const getDefaultSubmitDelay = () => process.env.SUBMIT_DELAY ? parseInt(process.env.SUBMIT_DELAY) : 10000


export interface ServerOptions {
    interval?: number,
    submitDelay?: number,
}

export const defaultOptions: ServerOptions = {
    interval: getDefaultInterval(),
    submitDelay: getDefaultSubmitDelay(),
}

export interface PageFactory {
    newPage(): Promise<Page>
}

export abstract class Server<T> {

    private identifier: string;
    private repository: Repository<T>;
    private logPrefix: string;
    private options: ServerOptions;
    private pageFactory: PageFactory;

    protected constructor(identifier: string,
                          pageFactory: PageFactory,
                          repository: Repository<T>,
                          options: ServerOptions = defaultOptions) {

        this.identifier = identifier;
        this.pageFactory = pageFactory;
        this.repository = repository;
        this.options = options;
        this.logPrefix = `[${this.identifier}] `
    }

    async prepare(page: Page): Promise<void> {}

    abstract spider(page: Page): Promise<T[]>;
    abstract submit(page: Page, key: T): Promise<void>

    async start(): Promise<void> {
        console.log(this.logPrefix + "starting server with interval " + this.options.interval + "ms")
        let page = await this.pageFactory.newPage();

        await this.prepare(page).catch(async (e) => {
            console.log(e.stack)
            let message = this.logPrefix + `Error on prepare: ` + e;
            console.error(message)
            await sendLog(message)
            process.kill(1)
        });

        while (true) {
            await this.run(page).catch(async (e) => {

                if(e instanceof Error && e.message.includes("Session closed")) {
                    console.log(this.logPrefix + "target closed, restarting")
                    page = await this.pageFactory.newPage();
                    await this.prepare(page).catch(() => console.error("Failed to prepare page"))
                    return
                }

                console.trace(e)
                let message = this.logPrefix + `Error on run: ` + e;
                console.error(message)
                await sendLog(message)
                const time = new Date()
                console.log("Saving screenshot: ", time)
                await page.screenshot({path: time + '.png', fullPage: true})
                    .catch((e) => console.error("Failed to save screenshot", e));
            });

            await new Promise(resolve => setTimeout(resolve, this.options.interval));
        }
    }

    async run(page: Page) {
        console.log(this.logPrefix + "running")
        const keys = await this.spider(page)

        const repoKeys = await this.repository.getAll()
        const newKeys = keys.filter((key) => !repoKeys.includes(key))

        if(newKeys.length === 0) {
            console.log(this.logPrefix + "no new listings found")
            return
        }

        for (const key of newKeys) {
            console.log(this.logPrefix + "new listing found: " + key)
            await this.submit(page, key);
            await this.repository.add(key);
            console.log(this.logPrefix + "listing stored as submitted: " + key)
            await new Promise(resolve => setTimeout(resolve, this.options.submitDelay));
        }
    }
}
