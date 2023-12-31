import { isSubmitEnabled, Server } from "../server.ts";
import { Browser, Page } from "puppeteer";
import { LineFileStorage } from "../line-file-storage.ts";
import { clearAndType, filterLargeSizeRequests, gotoOrReload } from "../puppeteer.ts";
import { userData } from "../user-data.ts";
import { sendExposeContacted } from "../telegram.ts";

export class DwServer extends Server<string> {

    baseUrl = "https://www.deutsche-wohnen.com";
    spiderUrl = process.env.DW_SPIDER_URL!;


    constructor(browser: Browser) {
        super("dw", browser, new LineFileStorage("resources/dw-listings.txt"));
    }

    async prepare(page: Page): Promise<void> {
        await filterLargeSizeRequests(page);
    }

    async spider(page: Page): Promise<string[]> {
        await gotoOrReload(page, this.spiderUrl);
        return await page.$$eval(".object-list__items .object-list__item a[href]",
            (elements) => elements.map((element) => {
                return element.getAttribute("href")!;
            }));
    }

    async submit(page: Page, href: string): Promise<void> {
        let exposeUrl = this.baseUrl + href;
        await page.goto(exposeUrl);

        await page.waitForSelector("#first-name");
        await clearAndType(page, "#first-name", userData.firstname);
        await clearAndType(page, "#last-name", userData.lastname);
        await clearAndType(page, "#email", userData.contactEmail);
        await clearAndType(page, "#phone", userData.phoneNumber);

        let employment;
        switch (userData.employmentRelationship) {
            case "STUDENT":
                employment = "Studierende(r)";
            case "PUBLIC_EMPLOYEE":
            default:
                employment = "Angestellte(r)";
        }
        await page.select("#currentEmployment", employment);

        await page.select("#incomeType", "1");

        let income;
        switch (true) {
            case userData.incomeAfterTaxes < 2000 :
                income = "M_1";
                break;
            case userData.incomeAfterTaxes < 3001 :
                income = "M_2";
                break;
            default:
                income = "M_3";
        }
        await page.select("#incomeLevel", income);

        let message = userData.staticContactMessage;
        await clearAndType(page, "#message", message);

        if (isSubmitEnabled()) {
            await page.click("button[type=submit]");
            await sendExposeContacted(exposeUrl, message);
        }
    }

}
