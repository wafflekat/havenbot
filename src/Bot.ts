import { Client, Message } from 'discord.js';
import { BotError, getHelp, getStatus, getWikiPage, gildList, handleForage } from './utils';

export class Bot {
  private client: Client;

  public async listen(): Promise<void> {
    this.client = new Client();
    await this.registerEvents();
    await this.client.login(process.env.TOKEN);
  }

  private async registerEvents(): Promise<void> {
    this.client.on('ready', this.readyListener.bind(this));
    this.client.on('message', this.messageListener.bind(this));
  }

  private readyListener(): void {
    console.log('Connected');
    this.client.user.setActivity({ name: 'Haven & Hearth', type: 'PLAYING' }).catch(console.error);
  }

  private async messageListener(message: Message): Promise<void> {
    if (!message.content.startsWith('!')) {
      return;
    }

    try {
      const args = message.content.slice(1).trim().split(/ +/);
      const cmd = args.shift()?.toLowerCase();

      switch (cmd) {
        case 'help': {
          const help = await getHelp();
          await message.channel.send(help);
          break;
        }

        case 'status': {
          const status = await getStatus();
          await message.channel.send(status);
          break;
        }

        case 'wiki': {
          const wikiData = await getWikiPage(args);
          await message.channel.send({ files: [wikiData.attachment], content: wikiData.url });
          break;
        }

        case 'gild':
        case 'gem': {
          if (args.length === 0 || args[0].trim() === '') {
            await message.channel.send('Use `!help` for a list of commands.');
          } else {
            const data = await gildList(args.join(' '), cmd);
            for (const item of data) {
              await message.channel.send(item);
            }
          }
          break;
        }

        case 'forage': {
          const data = await handleForage(args);
          for (const item of data) {
            await message.channel.send(item);
          }
          break;
        }

        default:
          break;
      }
    } catch (e) {
      if (e instanceof BotError) {
        await message.channel.send(e.message);
      } else {
        console.error(e);
      }
    }
  }
}
