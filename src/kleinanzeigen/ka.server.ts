import { Server } from "../server.ts";
import { Browser, Page } from "puppeteer";
import { LineFileStorage } from "../line-file-storage.ts";
import { getText, gotoOrReload } from "../puppeteer.ts";
import { sendCallToAction } from "../telegram.ts";
import { checkAndHandlePhoneContactOnlyExpose, isTemporaryApartment } from "../description-helper.ts";


export class KaServer extends Server<string> {

    baseUrl = "https://www.kleinanzeigen.de/"
    spiderUrl = process.env.KA_SPIDER_URL!

    constructor(browser: Browser) {
        super("ka", browser, new LineFileStorage("resources/ka-listings.txt"));
    }

    async spider(page: Page): Promise<string[]> {
        await gotoOrReload(page, this.spiderUrl);
        return await page.$$eval(".ad-listitem .aditem[data-href]",
            (elements) => elements.map((element) => {
                return element.getAttribute("data-href")!
            }))
    }

    async submit(page: Page, key: string): Promise<void> {
        const url = this.baseUrl + key;
        await page.goto(url);

        await page.waitForSelector("#viewad-description-text");
        const description = await getText(page, "#viewad-description-text")
            .then((text) => text?.trim());
        this.logger.log(`description: ${description}`)

        const temporary = await isTemporaryApartment(description!)
        if(temporary) {
            this.logger.log(`canceling submit because apartment is temporary`);
            return
        }

        const phoneOnly = await checkAndHandlePhoneContactOnlyExpose(url, description!);
        if(phoneOnly) {
            return
        }

        await sendCallToAction(`Neue Wohnung auf kleinanzeigen gefunden: ${url}`)

        // await page.goto("https://www.kleinanzeigen.de/m-einloggen.html")
        // await page.waitForSelector("#login-email");
        // await clearAndType(page, "#login-email", userData.ka_email);
        //
        // await page.waitForSelector("#login-password");
        // await clearAndType(page, "#login-password", userData.ka_password);
        //
        // const recs = await page.findRecaptchas();
        //
        // console.log(recs);
        // const solves= await page.solveRecaptchas();
        //
        // console.log(solves);
        //
        // await page.click("button[type=submit]");
        //
        // await page.waitForNavigation();
        //
        // await gotoOrReload(page, url);
        //
        // await page.waitForSelector("#viewad-contact");
        // const contact = await getText(page, "#viewad-contact .text-body-regular-strong")
        //     .then((text) => text?.trim());
        // this.logger.log(`contactpoint: ${contact}`)
        //
        // const contactMessage = await buildContactMessage(userData, description!)
        // this.logger.log(`contact message: ${contactMessage}`)
        //
        // await clearAndType(page, "[name=message]", contactMessage);
        // await clearAndType(page, "[name=contactName]", `${userData.firstname} ${userData.lastname}`);
        // await clearAndType(page, "[name=phoneNumber]", userData.phoneNumber);
        //
        // await page.click("button[type=submit]");
        //
        // await page.waitForSelector(".ajaxform-success-msg");
        //
        // await sendExposeContacted(url, contactMessage)

    }

}
