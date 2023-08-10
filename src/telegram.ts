import axios from "axios";

export async function sendExposeContacted(url: string, message: string) {
    const text = `Wohnung kontaktiert.\n\n${url}\n\nNachricht:\n\n${message}`;
    await sendMessage(process.env.TELEGRAM_SUBMIT_CHAT_ID!, text);
}

export async function sendPhoneContactOnly(url: string, phoneNumber: string) {
    const text = `Wohnung ist nur per Telefon zu kontaktieren.\n\n${url}\n\n${phoneNumber}`;
    await sendMessage(process.env.TELEGRAM_NOTIFY_CHAT_ID!, text);
}

export async function sendLog(message: string) {
    await sendMessage(process.env.TELEGRAM_LOGS_CHAT_ID!, message);
}

export async function sendCallToAction(message: string) {
    await sendMessage(process.env.TELEGRAM_NOTIFY_CHAT_ID!, message);
}

export async function sendMessage(chatId: string, text: string): Promise<void> {
    const botApiKey = process.env.TELEGRAM_API_KEY;
    const sendMessageUrl = `https://api.telegram.org/bot${botApiKey}/sendMessage`;
    const body = { "chat_id": chatId, "text": text }
    await axios
        .post(sendMessageUrl, body)
        .then((res) => {
            console.log(`Telegram /sendMessage response statusCode: ${res.status}`);
        })
        .catch((error) => {
            console.error(error);
        });
}
