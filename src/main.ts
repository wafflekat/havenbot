require('dotenv').config();
import { Bot } from './Bot'

const bot = new Bot();
bot.listen();