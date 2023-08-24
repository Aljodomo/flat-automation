import { Page } from "puppeteer";
import { Repository } from "./line-file-storage.ts";
import { sendLog } from "./telegram.ts";
import {ConsoleLogger, Logger} from "./logger.ts";

const getDefaultInterval = () => process.env.SPIDER_INTERVAL ? parseInt(process.env.SPIDER_INTERVAL) : 45000
const getDefaultSubmitDelay = () => process.env.SUBMIT_DELAY ? parseInt(process.env.SUBMIT_DELAY) : 10000
export const isSubmitEnabled = () => process.env.SUBMIT_ENABLED ? process.env.SUBMIT_ENABLED === "true" : true


export interface ServerOptions {
    interval?: number,
    submitDelay?: number,
}

const getDefaultOptions = (): ServerOptions => ({
    interval: getDefaultInterval(),
    submitDelay: getDefaultSubmitDelay(),
})

export interface PageFactory {
    newPage(): Promise<Page>
}

export abstract class Server<T> {

    private identifier: string;
    private repository: Repository<T>;
    logPrefix: string;
    private options: ServerOptions;
    private pageFactory: PageFactory;
    logger: Logger

    protected constructor(identifier: string,
                          pageFactory: PageFactory,
                          repository: Repository<T>,
                          options: ServerOptions = getDefaultOptions()) {

        this.identifier = identifier;
        this.pageFactory = pageFactory;
        this.repository = repository;
        this.options = options;
        this.logPrefix = `[${this.identifier}] `;
        this.logger = new ConsoleLogger(identifier)
    }

    async prepare(page: Page): Promise<void> {}

    abstract spider(page: Page): Promise<T[]>;
    abstract submit(page: Page, key: T): Promise<void>

    async start(): Promise<void> {
        this.logger.log("starting server with interval " + this.options.interval + "ms")
        let page = await this.pageFactory.newPage();

        await this.prepare(page).catch(async (e) => {
            this.logger.log(e.stack)
            let message = `Error on prepare: ` + e;
            this.logger.error(message)
            await sendLog(message)
            process.kill(1)
        });

        while (true) {
            await this.run(page).catch(async (e) => {

                if(e instanceof Error && e.message.includes("Session closed")) {
                    this.logger.log("target closed, restarting")
                    page = await this.pageFactory.newPage();
                    await this.prepare(page).catch(() => console.error("Failed to prepare page"))
                    return
                }

                let message = this.logPrefix + `Error on run: ` + e;
                this.logger.error(message)
                await sendLog(message)
                const time = new Date()
                this.logger.log("Saving screenshot: ", time)
                await page.screenshot({path: time + '.png', fullPage: true})
                    .catch((e) => console.error("Failed to save screenshot", e));
            });

            await new Promise(resolve => setTimeout(resolve, this.options.interval));
        }
    }

    async run(page: Page) {
        this.logger.log("running")
        const keys = await this.spider(page)

        const repoKeys = await this.repository.getAll()
        const newKeys = keys.filter((key) => !repoKeys.includes(key))

        if(newKeys.length === 0) {
            return
        }

        for (const key of newKeys) {
            this.logger.log("new listing found: " + key)
            await this.submit(page, key);
            await this.repository.add(key);
            this.logger.log("listing stored as submitted: " + key)
            await new Promise(resolve => setTimeout(resolve, this.options.submitDelay));
        }
    }

    log(message: string) {
        this.logger.log(message)
    }
}
