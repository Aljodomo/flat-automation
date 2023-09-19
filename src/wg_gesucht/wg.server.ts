import { isSubmitEnabled, Server } from "../server.ts";
import { Browser, Page } from "puppeteer";
import { LineFileStorage } from "../line-file-storage.ts";
import { sendCallToAction, sendLog } from "../telegram.ts";
import { filterLargeSizeRequests, gotoOrReload } from "../puppeteer.ts";

export class WgServer extends Server<string> {

    baseUrl = "https://www.wg-gesucht.de";
    spiderUrl = process.env.WG_SPIDER_URL!;

    constructor(browser: Browser) {
        super("wg", browser, new LineFileStorage("resources/wg-listings.txt"));
    }

    async prepare(page: Page): Promise<void> {
        await filterLargeSizeRequests(page);
    }

    async spider(page: Page): Promise<string[]> {
        await gotoOrReload(page, this.spiderUrl);
        return await page.$$eval(".offer_list_item .card_image a[href]",
            (elements) => elements.map((element) => {
                return element.getAttribute("href")!;
            }).filter((href) => !href.includes("asset_id")));
    }

    async submit(page: Page, key: string): Promise<void> {
        let url = this.baseUrl + key;
        if (isSubmitEnabled()) {
            await sendCallToAction("Neue WG-Gesucht Wohnung gefunden. Bitte manuell prüfen und bewerben.\n" + url);
        }
        // console.log("Navigating to: ", url)
        // await page.goto(url)
        // await page.waitForSelector("#ad_description_text")
        // // (#ad_description_text p) --> beinhaltet die Beschreibungen (können meherere sein)
        //
        // // Dismiss cookie banner
        // // Collect listing description
        // // Create message from listing description
        // // Login
        // url = this.baseUrl + "/nachricht-senden" + href
        // console.log("Navigating to: ", url)
        // await page.goto(url)
        //
        // await page.waitForSelector("#message_input")
        // await page.type("#message_input", "Hallo, ich bin sehr interessiert an deiner Anzeige. Ich würde mich sehr freuen, wenn du dich bei mir meldest. Viele Grüße, Philipp")
        // // Add files
        // // await page.click("button[type=submit]")
        // console.log("Submitted!")
    }

}
