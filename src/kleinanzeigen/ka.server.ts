import { isSubmitEnabled, Server } from "../server.ts";
import { Browser, Page } from "puppeteer";
import { LineFileStorage } from "../line-file-storage.ts";
import { clearAndType, filterLargeSizeRequests, getText, gotoOrReload, isVisible } from "../puppeteer.ts";
import { sendExposeContacted } from "../telegram.ts";
import {
    buildContactMessage,
    checkAndHandlePhoneContactOnlyExpose,
    isTemporaryApartment
} from "../description-helper.ts";
import { userData } from "../user-data.ts";


export class KaServer extends Server<string> {

    baseUrl = "https://www.kleinanzeigen.de/"
    spiderUrl = process.env.KA_SPIDER_URL!

    constructor(browser: Browser) {
        super("ka", browser, new LineFileStorage("resources/ka-listings.txt"));
    }

    async prepare(page: Page): Promise<void> {
        await filterLargeSizeRequests(page);
        await this.setDismissCookie(page);
    }

    private async setDismissCookie(page: Page) {
        await page.setCookie({
            name: "ekConsentBucketTcf2",
            value: "none2",
            domain: ".kleinanzeigen.de"
        })
        await page.setCookie({
            name: "ekConsentTcf2",
            value: "{%22customVersion%22:6%2C%22encodedConsentString%22:%22CPxWatcPxWatcE1ABADEC4CgAAAAAAAAAAYgJNwLgAXAA4ACWAFMAPwAzYCLAIuAZ8A14B0gD7AI8ASKAlcBMgCmwFhALqAXeAvoBggDBgGfANGAaaA1UBtADggHHgOUAc6A58B2wDuQHggPJAfaA_YCCIEFAI0gR2Aj6BIiCSIJJgSbAAAASUgAwABBKElABgACCUJCADAAEEoR0AGAAIJQjIAMAAQShFQAYAAglCIgAwABBKENABgACCUISADAAEEoQA%22%2C%22googleConsentGiven%22:false%2C%22consentInterpretation%22:{%22googleAdvertisingFeaturesAllowed%22:false%2C%22googleAnalyticsAllowed%22:false%2C%22infonlineAllowed%22:false%2C%22theAdexAllowed%22:false%2C%22criteoAllowed%22:false%2C%22facebookAllowed%22:false%2C%22amazonAdvertisingAllowed%22:false%2C%22rtbHouseAllowed%22:false}}",
            domain: ".kleinanzeigen.de"
        })
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
        await gotoOrReload(page, url);

        await page.waitForSelector("#viewad-description-text");
        const description = await getText(page, "#viewad-description-text")
            .then((text) => text?.trim());
        this.logger.info(`description: ${description}`)

        const temporary = await isTemporaryApartment(description!)
        if(temporary) {
            this.logger.info(`canceling submit because apartment is temporary`);
            return
        }

        const phoneOnly = await checkAndHandlePhoneContactOnlyExpose(url, description!);
        if(phoneOnly) {
            return
        }

        if(!(await isVisible(page, "#user-logout"))) {
            await page.goto("https://www.kleinanzeigen.de/m-einloggen.html")
            await page.waitForSelector("#login-email");
            await clearAndType(page, "#login-email", userData.ka_email);

            await page.waitForSelector("#login-password");
            this.logger.info(`typing password`);
            await page.type("#login-password", userData.ka_password);

            await page.waitForSelector('iframe[src*="recaptcha/"]')

            const {solved}= await page.solveRecaptchas();
            for(const rec of solved) {
                this.logger.info(`Recaptcha ${rec.id} solved`);
            }

            await Promise.all([
                page.click("#login-submit"),
                page.waitForNavigation()
            ]);

            await gotoOrReload(page, url);
        }

        await page.waitForSelector("#viewad-contact");
        const contact = await getText(page, "#viewad-contact .text-body-regular-strong")
            .then((text) => text?.trim());
        this.logger.info(`contact point: ${contact}`)

        const fullDescription = `Kontakt: ${contact}\n\nBeschreibungstext: ${description}`;
        
        let contactMessage = await buildContactMessage(userData, fullDescription);

        if(userData.ka_contactMessagePs) {
            contactMessage += `\n\n${userData.ka_contactMessagePs}`
        }

        this.logger.info(`contact message: ${contactMessage}`)

        await clearAndType(page, "[name=message]", contactMessage);
        await clearAndType(page, "[name=contactName]", `${userData.firstname} ${userData.lastname}`);
        await clearAndType(page, "[name=phoneNumber]", userData.phoneNumber);

        if(isSubmitEnabled()) {
            await page.click("#viewad-contact-bottom button[type=submit]");
            await page.waitForSelector(".ajaxform-success-msg");
            await sendExposeContacted(url, contactMessage)
        }

    }

}
