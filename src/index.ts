import { config } from "dotenv";
import { newBrowser } from "./puppeteer.ts";
import { sendLog } from "./telegram.ts";
import { ImmoServer } from "./immo/immo.server.ts";
import { DwServer } from "./deutsche-wohnen/dw.server.ts";
import { WgServer } from "./wg-gesucht/wg.server.ts";

Error.stackTraceLimit = Infinity;

config()

export const browser = await newBrowser()

setInterval(() => {
  sendLog("I am alive!")
}, 1000 * 60 * 60)

new ImmoServer(browser).start()

new DwServer(browser).start()

new WgServer(browser).start()
