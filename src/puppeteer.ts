import puppeteer from 'puppeteer-extra'
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha'
import { Page } from "puppeteer";
import exp from "constants";

export async function newBrowser() {

    puppeteer.use(
        RecaptchaPlugin({
            provider: {
                id: '2captcha',
                token: process.env.TWO_CAPTCHA_API_KEY
            },
            visualFeedback: true
        })
    )

    return puppeteer.launch({
        headless: "new",
        // headless: false,
        args: ['--no-sandbox'],
        defaultViewport: {
            width: 1920,
            height: 1080
        }
    })
}

export async function clearAndType(page: Page, selector: string, value: string) {
    await page.waitForSelector(selector)
    const inputValue = await page.$eval(selector, el => (el as HTMLInputElement).value);
    await page.click(selector);
    for (let i = 0; i < inputValue.length; i++) {
        await page.keyboard.press('Backspace');
    }
    await page.type(selector, value);
}

export async function gotoOrReload(page: Page, url: string) {
    if(page.url() === url) {
        await page.reload()
    } else {
        await page.goto(url)
    }
}

export async function filterLargeSizeRequests(page: Page) {

    console.log("Setting up request intercepting")

    await page.setRequestInterception(true);

    page.on('request', (request) => {
        if (['image', 'font'].includes(request.resourceType())) {
            request.abort();
        } else {
            request.continue();
        }
    });
}
