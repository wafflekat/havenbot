import { BufferResolvable, MessageAttachment, MessageEmbed } from 'discord.js';
import got, { HTTPError, Response } from 'got';
import HTMLParser from 'node-html-parser';
import puppeteer from 'puppeteer';
import forage from './forage.json';
import gild from './gild.json';
import gem from './gem.json';
import help from './help.json';

export class BotError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export const getStatus = async () => {
  try {
    const response = await got('http://www.havenandhearth.com/portal/');
    return parseStatus(response.body);
  } catch (e) {
    console.log(e);
    throw new BotError('Could not get status');
  }
};

const ucFirst = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const searchWiki = async (name: string): Promise<{ url: string, attachment: MessageAttachment }> => {
  name = name.replace('_', '+');
  try {
    const response = await got(`http://ringofbrodgar.com/w/index.php?title=Special%3ASearch&search=${name}&fulltext=Search`);

    if (HTMLParser(response.body).toString().includes('mw-search-results')) {
      const root = HTMLParser(response.body);
      const ul = root.querySelector('.mw-search-results');

      const result = ul.childNodes[0].childNodes[0].childNodes[0].childNodes[0].text;


      return getWikiPage(result);

    } else {
      throw new BotError('Page does not exist');
    }

  } catch (e) {
    if (e instanceof BotError) {
      throw e;
    } else {
      console.log(e);
    }
  }
};

const parseWikiName = (name: string | string[]): string => {
  let nameString: string;
  if (Array.isArray(name)) {
    for (let i = 0; i < name.length; i++) {
      name[i] = ucFirst(name[i]);
    }

    if (name.length > 1) {
      nameString = name.join('_');
    } else if (name.length === 1) {
      nameString = name[0];
    }
  } else {
    nameString = name.replace(' ', '_');
  }
  return encodeURIComponent(nameString);
};

export const getWikiPage = async (name: string | string[]): Promise<{ url: string, attachment: MessageAttachment }> => {
  name = parseWikiName(name);

  try {
    await got(`http://ringofbrodgar.com/wiki/${name}`);

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 2000, height: 2000 });

    await page.goto(`http://ringofbrodgar.com/wiki/${name}`);

    async function screenshotDOMElement(opts: { padding: number, selector: string }) {
      const padding = opts.padding || 0;
      const selector = opts.selector;

      const rect = await page.evaluate(selector => {
        const element = document.querySelector(selector);
        if (!element)
          return null;
        const { x, y, width, height } = element.getBoundingClientRect();
        return { left: x, top: y, width, height, id: element.id };
      }, selector);

      if (!rect) {
        throw new BotError('Page does not exist');
      }

      return await page.screenshot({
        clip: {
          x: rect.left - padding,
          y: rect.top - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        },
      });
    }

    const image = await screenshotDOMElement({
      selector: '.infobox',
      padding: 16,
    });
    const attachment = new MessageAttachment(image as BufferResolvable, `${name}.png`);

    await browser.close();

    return { url: `<http://ringofbrodgar.com/wiki/${name}>`, attachment };


  } catch (e) {
    if (e instanceof HTTPError) {
      return searchWiki(name);
    } else if (e instanceof BotError) {
      throw e;
    } else {
      console.log(e);
    }
  }
};

const parseStatus = async (body: string) => {
  const root = HTMLParser(body);
  const div = root.querySelector('#status');

  let status = '';
  for (let i = 0; i < div.childNodes.length; i++) {
    if (i % 2 > 0) {
      let text = div.childNodes[i].childNodes[0].text;
      text = text.replace(/\s\s+/g, ' ');
      text = text.replace(' up', ' **up**');
      status += text;
      status += '\n';
    }
  }
  return status;
};

export const handleForage = async (args: any) => {
  if (args[0] === 'list') {
    if (args.length >= 3) {
      if (!isNumber(args[1]) || !isNumber(args[2])) {
        throw new BotError('The correct format is ``!forage list PER EXP`` where PER and EXP are numbers');
      }
      let truncate = args.length === 4 && args[3] === '-t';
      return forageListChance(parseInt(args[1]), parseInt(args[2]), truncate);
    } else {
      return [forageList()];
    }
  } else {
    if (args.length === 0 || args[0].trim() === '') {
      throw new BotError('Use ``!help`` for a list of commands.');
    } else {
      return [forageChance(args.join(' '))];
    }
  }
};

export const forageChance = (name: string) => {
  for (let i = 0; i < forage.length; i++) {
    if (forage[i].name.toLowerCase() === name.toLowerCase()) {
      return `The base PER EXP for **${name}** is ${forage[i].base}.\nYou'll start seeing it at **${forage[i].base / 2}**, and see all of it at **${forage[i].base * 2}**.`;
    }
  }
  throw new BotError(`I didn't find a forageable named **${name}**. For a list of forageables say **!forage list** `);
};

export const forageList = () => {
  let message = '';
  for (let f of forage) {
    message += `${f.name}, `;
  }
  message = message.substring(0, message.length - 2);
  message += '.';
  return message;
};

export const forageListChance = async (per: number, exp: number, truncate: boolean) => {
  const val = per * exp;
  let fields = [];
  for (let i = 0; i < forage.length; i++) {
    let chance = Math.min(Math.round(100 * (2 * val - forage[i].base) / (3 * forage[i].base)), 100);
    if (chance <= 0 || (chance === 100 && truncate)) {
      continue;
    }

    fields[i] = {
      name: forage[i].name,
      value: `${chance}%`,
      inline: true,
    };
  }

  return createMultipartMessage(fields);

};

export const gildList = async (args: string, type: 'gild' | 'gem') => {
  let list: Array<any>;
  if (type === 'gild') {
    list = gild;
  } else {
    list = gem;
  }

  if (args.toLowerCase() === 'ua') args = 'unarmed combat';
  if (args.toLowerCase() === 'mc') args = 'melee combat';
  if (args.toLowerCase() === 'str') args = 'strength';
  if (args.toLowerCase() === 'agi') args = 'agility';
  if (args.toLowerCase() === 'int') args = 'intelligence';
  if (args.toLowerCase() === 'psy') args = 'psyche';
  if (args.toLowerCase() === 'per') args = 'perception';

  let fields = [];
  for (let i = 0; i < list.length; i++) {
    if (list[i].gild1.toLowerCase().includes(args.toLowerCase()) ||
      list[i].gild2.toLowerCase().includes(args.toLowerCase()) ||
      list[i].gild3.toLowerCase().includes(args.toLowerCase()) ||
      list[i].gild4.toLowerCase().includes(args.toLowerCase())) {

      let values = [list[i].gild1, list[i].gild2, list[i].gild3, list[i].gild4].filter(Boolean).join(', ');

      fields.push({
        name: list[i].name,
        value: `${values}`,
      });
    }
  }

  if (fields.length === 0) {
    throw new BotError(`Couldn't find any gildings with attribute **${args}**`);
  } else {
    return createMultipartMessage(fields);
  }

};

const createMultipartMessage = async (fields: Array<{ name: string, value: any }>) => {
  const embeds = [];
  for (let i = 0; i < fields.length; i += 25) {
    const fieldGroup = fields.slice(i, i + 25);
    if (fieldGroup && fieldGroup.length > 0) {
      embeds.push({ embed: { fields: fieldGroup } });
    }
  }
  return embeds;
};

export const getHelp = () => {
  return new MessageEmbed()
    .setTitle(help.title)
    .addFields(help.fields);
};

export const isNumber = (n: any) => {
  return !isNaN(parseInt(n)) && isFinite(n);
};