import { Client, Message } from 'discord.js';
import {
  BotError,
  getHelp,
  getStatus,
  getWikiPage,
  gildList, handleForage,
} from './utils';

export class Bot {

  private client: Client;

  public async listen() {
    this.client = new Client();
    await this.registerEvents();
    await this.client.login(process.env.TOKEN);
  }


  private async registerEvents() {
    this.client.on('ready', this.readyListener.bind(this));
    this.client.on('message', this.messageListener.bind(this));
  }

  private async readyListener() {
    console.log('Connected');
    this.client.user.setActivity({ name: 'Haven & Hearth', type: 'PLAYING' });
  }

  private async messageListener(message: Message) {
    if (message.content.substring(0, 1) !== '!')
      return;

    try {
      let args = message.content.substring(1).split(' ');
      const cmd = args[0];
      args = args.splice(1);

      switch (cmd) {
        case 'help':
          const help = await getHelp();
          message.channel.send(help);
          break;

        case 'status':
          const status = await getStatus();
          message.channel.send(status);
          break;

        case 'wiki':
          const wikiData = await getWikiPage(args);
          message.channel.send(wikiData.url, { files: [wikiData.attachment] });
          break;

        case 'gild':
        case 'gem':
          if (args.length === 0 || args[0].trim() === '') {
            message.channel.send('Use ``!help`` for a list of commands.');
          } else {
            const data = await gildList(args.join(' '), cmd);
            for (let item of data) {
              await message.channel.send(item);
            }
          }
          break;

        case 'forage':
          const data = await handleForage(args);
          for (let item of data) {
            await message.channel.send(item);
          }
          break;
      }
    } catch (e) {
      if (e instanceof BotError) {
        message.channel.send(e.message);
      } else {
        console.log(e);
      }
    }
  }

}