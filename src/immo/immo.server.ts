import { Server } from "../server.ts";
import { Browser, Page } from "puppeteer";
import { LineFileStorage } from "../line-file-storage.ts";
import { ImmoSetup } from "./immo.setup.ts";
import { ImmoSpider } from "./immo.spider.ts";
import { ImmoSubmit } from "./immo.submit.ts";
import { userData } from "../user-data.ts";

export class ImmoServer extends Server<string> {

    spiderUrl = process.env.IMMO_SPIDER_URL!

    immoSetupClient = new ImmoSetup(this.logger)
    immoSpider = new ImmoSpider(this.logger)
    immoSubmit = new ImmoSubmit(this.logger)

    constructor(browser: Browser) {
        super("immo", browser, new LineFileStorage("resources/immo-listings.txt"));
    }

    async prepare(page: Page): Promise<void> {
        await this.immoSetupClient.prepare(page)
        await this.immoSetupClient.access(page, this.spiderUrl)
    }

    async spider(page: Page): Promise<string[]> {
        await this.immoSetupClient.access(page, this.spiderUrl)
        return this.immoSpider.getExposeIds(page)
    }

    async submit(page: Page, key: string): Promise<void> {
        await this.immoSubmit.submit(page, key, userData)
    }

}
