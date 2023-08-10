import { Page } from "puppeteer";

export async function filterRequest(page: Page) {

    console.log("Setting up request intercepting")

    await page.setRequestInterception(true);

    page.on('request', (request) => {
        if (request.url().includes("https://api.geetest.com/get.")) {
            const u = request.url();
            console.log(`Blocked request to ${u.substring(0, 50)}...`);
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
