import config from './config/app.json';
import TelegramBot from 'node-telegram-bot-api';

let token = config.TELEGRAM_API_KEY;
let bot = new TelegramBot(token, { polling: false });


export const sendMessage = (_msg) => {

    bot.sendMessage(config.TELEGRAM_CHAT_ID, `${config.name}: ${_msg}`);

}