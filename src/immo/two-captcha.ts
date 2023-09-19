// 2captcha
import { Page } from "puppeteer";
import { Solver } from "2captcha";

const gtRegex = /gt: "([a-zA-Z0-9]*)"/gm;
const challengeRegex = /challenge: "([a-zA-Z0-9]*)"/gm;
const dataRegex = /data: "(.*)"/gm;

export class GeetestSolver {

    solver = new Solver(process.env.TWO_CAPTCHA_API_KEY!, 1000);

    async solveGeetestCaptcha(page: Page) {
        // console.log("Trying to solve geetest captcha")

        if (!await this.hasGeetestCaptcha(page)) {
            // console.log("No geetest captcha found")
            return;
        }

        try {
            await this.solve(page);
        } catch (e) {
            await page.reload();
            await page.waitForNetworkIdle();
            await this.solve(page);
        }
    }

    private async solve(page: Page) {
        console.log("Solving geetest captcha");
        const geetestV3request = this.getGeetestValues(await page.content());
        // console.log("Found geetestV3 request values", geetestV3request)

        const geetestResult = await this.solver.geetest(geetestV3request.gt, geetestV3request.challenge, page.url())
            .then((res) => res.data)
            .catch((e) => {
                console.error("Could not get geetest results from 2captcha server", e);
                throw e;
            });

        // console.log("Received geetestV3 results", geetestResult)

        await page.evaluate((geetestResult: any, geetestv3request: any) => {
            // @ts-ignore
            solvedCaptcha({
                geetest_challenge: geetestResult.geetest_challenge,
                geetest_validate: geetestResult.geetest_validate,
                geetest_seccode: geetestResult.geetest_seccode,
                data: geetestv3request.data
            });
        }, geetestResult, geetestV3request);
        await page.waitForNavigation();
        await page.waitForNetworkIdle({timeout: 5000}).catch(() => {
        });
        console.log("Geetest captcha solved");
    }

    private getFirstGroup(regexp: RegExp, str: string) {
        return Array.from(str.matchAll(regexp), m => m[ 1 ])[ 0 ];
    }

    async hasGeetestCaptcha(page: Page) {
        return (await page.content()).includes("initGeetest");
    }

    getGeetestValues(content: string) {
        const gt = this.getFirstGroup(gtRegex, content);
        const challenge = this.getFirstGroup(challengeRegex, content);
        const data = this.getFirstGroup(dataRegex, content);
        if (!gt || !challenge) {
            throw Error("Could not find gt or challenge values in content");
        }
        return {
            gt,
            challenge,
            data
        };
    }

}
