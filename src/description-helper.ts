import { chatGpt } from "./openai.ts";
import { sendCallToAction } from "./telegram.ts";
import { isSubmitEnabled } from "./server.ts";

export async function buildContactMessage(staticContactMessage: string, descriptionText: string, messagePrompt: string,  systemPrompt: string, useChatGtp: boolean) {
    let message = staticContactMessage;

    if (useChatGtp) {
        const userPrompt =
            descriptionText + "\n\n---------------\n\n" +
            messagePrompt + "\n\n" +
            "Der text enthält keine Platzhalter und ist kürzer als 1850 Buchstaben."

        message = await chatGpt(userPrompt, systemPrompt)
    }

    return message;
}

export async function isTemporaryApartment(description: string) {
    const temporary = await chatGpt(description + "\n\n----------------\n\n" + "Handelt es sich um eine Wohnung auf Zeit? Antworte nur mit 'true' oder 'false'.");
    return temporary.toLowerCase().trim() === "true";
}

export async function checkAndHandlePhoneContactOnlyExpose(url: string, descriptionText: string) {
    let response = await chatGpt(descriptionText + "\n\n------\n\nIst nur telefonischer Kontakt möglich? Beginne die Antwort mit 'true' oder 'false' und folge mit der Telefonnummer in runden Klammern.")

    const isPhoneOnly = response.toLowerCase().trim().startsWith("true")

    if(isPhoneOnly) {
        console.log("Expose is phone contact only")
        const phoneNumber = response.match(/\(([^)]+)\)/)?.[1];
        console.log("Phone number: ", phoneNumber)
        const text = `Wohnung ist nur per Telefon zu kontaktieren.\n\n${url}\n\n${phoneNumber}`;
        if(isSubmitEnabled()) {
            await sendCallToAction(text)
        }
        return true
    }

    return false
}
