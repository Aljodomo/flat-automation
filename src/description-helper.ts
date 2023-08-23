import { UserData } from "./user-data.ts";
import { chatGpt } from "./openai.ts";
import { sendCallToAction } from "./telegram.ts";

export async function buildContactMessage(userData: UserData, descriptionText: string) {
    let message = userData.staticContactMessage;

    if (userData.chatGtp_active) {
        // console.log("Using ChatGTP to construct contact message")
        const userPrompt =
            descriptionText + "\n\n---------------\n\n" +
            userData.chatGtp_messagePrompt + "\n\n" +
            "Der text enthält keine Platzhalter und ist kürzer als 1850 Buchstaben."

        message = await chatGpt(userPrompt, userData.chatGtp_systemPrompt)
        // console.log("ChatGTP message: " + "\n\n---------------\n\n" + message + "\n\n---------------\n\n")
    }

    return message;
}

export async function isTemporaryApartment(description: string) {
    const temporary = await chatGpt(description + "\n\n----------------\n\n" + "Handelt es sich um eine Wohnung auf Zeit? Antworte nur mit 'true' oder 'false'.");
    return temporary.toLowerCase().trim() === "true";
}

export async function isPhoneContactOnlyExpose(url: string, descriptionText: string) {
    let response = await chatGpt(descriptionText + "\n\n------\n\nIst nur telefonischer Kontakt möglich? Beginne die Antwort mit 'true' oder 'false' und folge mit der Telefonnummer in runden Klammern.")

    const isPhoneOnly = response.trim().startsWith("true")

    if(isPhoneOnly) {
        console.log("Expose is phone contact only")
        const phoneNumber = response.match(/\(([^)]+)\)/)?.[1];
        console.log("Phone number: ", phoneNumber)
        const text = `Wohnung ist nur per Telefon zu kontaktieren.\n\n${url}\n\n${phoneNumber}`;
        await sendCallToAction(text)
        return true
    }

    return false
}
