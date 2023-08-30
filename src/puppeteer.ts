import puppeteer from 'puppeteer-extra'
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { Page } from "puppeteer";
import { sendLog } from "./telegram.ts";

export async function newBrowser() {

    puppeteer.use(
        AdblockerPlugin({
            // Optionally enable Cooperative Mode for several request interceptors
            interceptResolutionPriority: DEFAULT_INTERCEPT_RESOLUTION_PRIORITY
        })
    )

    puppeteer.use(StealthPlugin())

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
    let originalInputValue = await page.$eval(selector, el => (el as HTMLInputElement).value);

    await page.click(selector);
    await page.keyboard.press('End');
    await page.keyboard.down('Shift');
    await page.keyboard.press('Home');
    await page.keyboard.up('Shift');
    await page.keyboard.press('Backspace');

    const input = await page.$(selector);
    await input!.click({ count: 3 })
    await page.keyboard.press('Backspace');

    await page.evaluate((selector) => {
        (document.querySelector(selector) as HTMLInputElement)!.value = '';
    }, selector);

    const clearedInputValue = await page.$eval(selector, el => (el as HTMLInputElement).value);
    if(clearedInputValue) {
        await sendLog(`${selector}: inputValue is not empty after clear: before[${originalInputValue}] after[${clearedInputValue}]`)
        throw new Error(`${selector}: inputValue is not empty after clear: before[${originalInputValue}] after[${clearedInputValue}]`)
    }
    if(originalInputValue !== clearedInputValue) {
        console.log(selector + ": input value before clear: " + originalInputValue)
        console.log(selector + ": input value after clear: " + clearedInputValue)
    }
    if(!originalInputValue) {
        console.log(selector + ": original input value was empty")
    }
    console.log(`${selector}: typing value: ${value}`)
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

export async function getText(page: Page, selector: string) {
    const ele = await page.waitForSelector(selector)
    return ele?.evaluate((el) => el.textContent);
}

export async function isVisible(page: Page, selector: string) {
    try {
        return await page.$eval(selector, (el) => !!(el as HTMLElement).offsetParent);
    } catch (e) {
        return false;
    }
}
