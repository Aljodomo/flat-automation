import { Page } from "puppeteer";
import { Repository } from "./line-file-storage.ts";
import { sendLog } from "./telegram.ts";
import {ConsoleLogger, Logger} from "./logger.ts";
import {setTimeout} from "timers/promises";

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
        this.logger.info("starting server with interval " + this.options.interval + "ms")

        while (true) {
            let page = await this.pageFactory.newPage();

            await this.prepare(page).catch(async (e) => {
                this.logger.info(e.stack)
                let message = `Error on prepare: ` + e;
                this.logger.error(message)
                await sendLog(message)
            });

            await this.run(page).catch(async (e) => {
                this.logger.error(e.stack)
                this.logger.error(`Error on run: ` + e)
                await sendLog(`Error on run: ` + e)
                const time = new Date()
                this.logger.info("Saving screenshot: ", time)
                await page.screenshot({path: time + '.png', fullPage: true})
                    .catch((e) => console.error("Failed to save screenshot", e));
            }).finally(async () => {
                await page.close();
            });

            await setTimeout(this.options.interval);
        }
    }

    async run(page: Page) {
        const keys = await this.spider(page)

        const repoKeys = await this.repository.getAll()
        const newKeys = keys.filter((key) => !repoKeys.includes(key))

        for (const key of newKeys) {
            const time = new Date()
            this.logger.info("new listing found: " + key + " at " + time)
            await this.submit(page, key);
            await this.repository.add(key);
            this.logger.info("listing stored as submitted: " + key)
            await setTimeout(this.options.submitDelay);
        }
    }

    log(message: string) {
        this.logger.info(message)
    }
}
