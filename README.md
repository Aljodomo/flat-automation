# Flat Automation

## Pre-requisites

- Chrome installed
- Node installed
- PNPM or NPM installed
- OpenAi API account
- TwoCaptcha account
- Telegram account
- Telegram bot created
- (Optional) Immo account (Premium)

## Installation

``pnpm i``
or
``npm i``

## Run

``pnpm start``
or
``npm start``

## Personal information

Create a file called `data.json` in the root directory of the project.
Containing all fields from the `src/user-data.ts` file.

## Environment variables

| Name                    | Description                                            | Default value | Required |
|-------------------------|--------------------------------------------------------|---------------|----------|
| TELEGRAM_API_KEY        |                                                        |               | yes      |
| TELEGRAM_NOTIFY_CHAT_ID | Group chat id to send notifications to                 |               | yes      |
| TELEGRAM_SUBMIT_CHAT_ID | Group chat id to send submit notification to           |               | yes      |
| TELEGRAM_LOGS_CHAT_ID   | Group chat id to send logs to                          |               | yes      |
| TWO_CAPTCHA_API_KEY     |                                                        |               | yes      |
| OPEN_AI_API_KEY         |                                                        |               | yes      |
| SUBMIT_ENABLED          |                                                        | true          | no       |
| SPIDER_INTERVAL         | Time between queries                                   | 45 seconds    | no       |
| SUBMIT_DELAY            | Delay between submits if multible submits must be send | 10 secods     | no       |
| IMMO_SPIDER_URL         | URl of immoscout search page to query                  |               | yes      |
| WG_SPIDER_URL           | URl of wg-gesucht search page to query                 |               | yes      |
| DW_SPIDER_URL           | URl of deutsche-wohnen search page to query            |               | yes      |
