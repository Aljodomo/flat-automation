import { Page } from "puppeteer";
import { GeetestSolver } from "./two-captcha.ts";
import {Logger} from "../logger.ts";

export class ImmoSetup {

    logger: Logger

    constructor(logger: Logger) {
        this.logger = logger
    }

    geetestSolver= new GeetestSolver()

    async prepare(page: Page) {
        await this.filterRequest(page)
        await this.setDismissCookie(page);
        return page
    }

    async access(page: Page, url: string): Promise<Page> {

        if(page.url() === url) {
            await page.reload()
        } else {
            await page.goto(url)
            await page.waitForNetworkIdle({
                timeout: 1000 * 5
            }).catch(() => {})
        }

        await this.geetestSolver.solveGeetestCaptcha(page)

        return page
    }

    private async setDismissCookie(page: Page) {
        this.logger.info("Setting dismiss cookies cookie")
        await page.setCookie({
            name: "consent_status",
            value: "true",
            domain: ".immobilienscout24.de"
        })
    }

    async filterRequest(page: Page) {

        this.logger.info("Setting up request intercepting")

        await page.setRequestInterception(true);

        page.on('request', (request) => {
            if (request.url().includes("https://api.geetest.com/get.")) {
                const u = request.url();
                this.logger.info(`Blocked request to ${u.substring(0, 50)}...`);
                request.abort();
                return;
            }
            if (['image', 'font'].includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });
    }

}

export async function isExposeDisabled(page: Page): Promise<boolean> {
    try {
        await page.waitForSelector(".status-warning", {timeout: 2000})
        console.log("Expose is deactivated")
        return true
    } catch (e) {
        return false
    }
}
