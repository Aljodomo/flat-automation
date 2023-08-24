import {Page} from "puppeteer";
import { userData } from "../user-data.ts";
import {Logger} from "../logger.ts";


export class ImmoSpider {

    logger: Logger

    constructor(logger: Logger) {
        this.logger = logger
    }

    async getExposeIds(page: Page) {

        const includeMieterPlusListing = userData.immoscout_plus_account && userData.immoscout_useLogin

        return await page.$$eval("#resultListItems > .result-list__listing:not(.touchpoint-space)",
            (elements, includeMieterPlusListing) => elements.filter(element => {
                if(includeMieterPlusListing) {
                    return true
                }
                return !element.querySelector(".plus-highlighter")
            }).map((element) => {
                return element.getAttribute("data-id")!
            }), includeMieterPlusListing)
    }

}



