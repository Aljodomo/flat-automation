import { Page } from "puppeteer";
import { GeetestSolver } from "./two-captcha.ts";
import { filterRequest } from "./puppeteer.ts";
import {Logger} from "../logger.ts";

export class ImmoSetup {

    logger: Logger

    constructor(logger: Logger) {
        this.logger = logger
    }

    geetestSolver= new GeetestSolver()

    async prepare(page: Page) {
        await filterRequest(page)
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
        this.logger.log("Setting dismiss cookies cookie")
        await page.setCookie({
            name: "consent_status",
            value: "true",
            domain: ".immobilienscout24.de"
        })
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
