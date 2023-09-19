import { Configuration, CreateChatCompletionRequest, OpenAIApi } from "openai";
import { AxiosError } from "axios";

export async function chatGpt(userPrompt: string, systemPrompt: string = "", temperature: number = 0.7) {

    const config = new Configuration({
        apiKey: process.env.OPEN_AI_API_KEY,
        basePath: "https://api.openai.com/v1"
    });

    const openai = new OpenAIApi(config);

    const payload: CreateChatCompletionRequest = {
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: userPrompt
            }
        ],
        temperature: temperature
    };

    const res = await openai.createChatCompletion(payload, {
        timeout: 60 * 1000
    }).catch((e: AxiosError) => {
        console.log(`OpenAI Payload: ${JSON.stringify(payload)}`);
        console.log(`OpenAI Error: ${JSON.stringify(e.response?.data)}`);
        throw new Error("Could not fetch ChatGTP message: " + e.message);
    });

    return res.data.choices[ 0 ].message!.content!;
}
