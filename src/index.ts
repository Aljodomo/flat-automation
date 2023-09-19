import { config } from "dotenv";
import { newBrowser } from "./puppeteer.ts";
import { sendLog } from "./telegram.ts";
import { ImmoServer } from "./immo/immo.server.ts";
import { DwServer } from "./deutsche_wohnen/dw.server.ts";
import { WgServer } from "./wg_gesucht/wg.server.ts";
import { isSubmitEnabled } from "./server.ts";
import { KaServer } from "./kleinanzeigen/ka.server.ts";

config();

console.log("Submit: " + (isSubmitEnabled() ? "enabled" : "disabled"));

export const browser = await newBrowser();

setInterval(() => {
    sendLog("I am alive!");
}, 1000 * 60 * 60);

new ImmoServer(browser).start();

new DwServer(browser).start();

new WgServer(browser).start();

new KaServer(browser).start();
