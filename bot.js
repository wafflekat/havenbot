require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client();
const request = require('request');
const HTMLParser = require('node-html-parser');
const puppeteer = require('puppeteer');
const wikiurl = 'http://ringofbrodgar.com/wiki/';
const forage = require('./forage.json');
const gild = require('./gild.json');
const gem = require('./gem.json');
const help = require('./help.json');

client.once('ready', () => {
  console.log('Connected');
  client.user.setActivity({name: 'Haven & Hearth', type: 'PLAYING'});
});

client.on('message', (message) => {
  if (message.content.substring(0, 1) === '!') {
    let args = message.content.substring(1).split(' ');
    const cmd = args[0];

    args = args.splice(1);

    switch (cmd) {
      case 'help':
        sendHelp(message.channel);
        break;

      case 'status':
        getStatus(message.channel);
        break;

      case 'wiki':
        getWikiPage(args, message.channel);
        break;

      case 'gild':
        if (args.length === 0 || args[0].trim() === '') {
          message.channel.send("Use ``!help`` for a list of commands.");
        } else {
          gildList(args.join(' '), message.channel, gild);
        }
        break;

      case 'gem':
        if (args.length === 0 || args[0].trim() === '') {
          message.channel.send("Use ``!help`` for a list of commands.");
        } else {
          gildList(args.join(' '), message.channel, gem);
        }
        break;

      case 'forage':
        if (args[0] === 'list') {
          if (args.length === 3) {
            if (!isNumber(args[1]) || !isNumber(args[2])) {
              message.channel.send("The correct format is ``!forage list PER EXP`` where PER and EXP are numbers");
              return;
            }
            forageListChance(args[1], args[2], message.channel);
          } else {
            forageList(message.channel);
          }
        } else {
          if (args.length === 0 || args[0].trim() === "") {
            message.channel.send("Use ``!help`` for a list of commands.");
          } else {
            forageChance(args.join(' '), message.channel);
          }
        }
        break;

      default:

        break;
    }
  }
});

client.login(process.env.TOKEN);

function getStatus(channel) {
  request('http://www.havenandhearth.com/portal/', (err, res, body) => {
    if (!err) {
      parseStatus(body, channel);
    } else {
      console.log(err);
    }
  });
}

function ucFirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function searchWiki(name, channel) {
  name = name.replace('_', '+');
  console.log('searchWiki', name);
  request(`http://ringofbrodgar.com/w/index.php?title=Special%3ASearch&search=${name}&fulltext=Search`, (err, res, body) => {
    if (!err) {
      if (HTMLParser.parse(body).toString().includes('mw-search-results')) {
        console.log('includes mw-search-results');
        const root = HTMLParser.parse(body);
        const ul = root.querySelector('.mw-search-results');

        const result = ul.childNodes[0].childNodes[0].childNodes[0].childNodes[0].text;


        getWikiPage(result, channel);

      } else {
        console.log('does not include mw-search-results');
        channel.send('page does not exist');
      }
    } else {
      console.log(err);
    }
  });
}

function getWikiPage(name, channel) {
  if (name.constructor === Array) {
    for (let i = 0; i < name.length; i++) {
      name[i] = ucFirst(name[i]);
    }

    if (name.length > 1) {
      name = name.join('_');
    } else if (name.length === 1) {
      name = name[0];
    }
  } else {
    name = name.replace(' ', '_');
  }

  if (name.toLowerCase() === 'dicktree') {
    channel.send("(`)\n" +
      " | |\n" +
      " | |\n" +
      " | |\n" +
      " | |\n" +
      " | |\n" +
      " | |\n" +
      " | |\n" +
      "(\\_)_)");
    return;
  }

  console.log('getWikiPage', name);

  request(`${wikiurl}${name}`, (err, res, body) => {
    if (!err) {
      if (HTMLParser.parse(body).toString().includes('There is currently no text in this page')) {
        searchWiki(name, channel);
      } else {

        (async () => {

          const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox']});
          const page = await browser.newPage();
          page.setViewport({width: 1000, height: 600, deviceScaleFactor: 1});

          await page.goto(`${wikiurl}${name}`);

          /**
           * Takes a screenshot of a DOM element on the page, with optional padding.
           *
           * @param {!{path:string, selector:string, padding:(number|undefined)}=} opts
           * @return {!Promise<!Buffer>}
           */
          async function screenshotDOMElement(opts = {}) {
            const padding = 'padding' in opts ? opts.padding : 0;
            const path = 'path' in opts ? opts.path : null;
            const selector = opts.selector;

            if (!selector)
              throw Error('Please provide a selector.');

            const rect = await page.evaluate(selector => {
              const element = document.querySelector(selector);
              if (!element)
                return null;
              const {x, y, width, height} = element.getBoundingClientRect();
              return {left: x, top: y, width, height, id: element.id};
            }, selector);

            if (!rect) {
              channel.send(`¯\\_(ツ)_/¯`);
              throw Error(`Could not find element that matches selector: ${selector}.`);
            }
            return await page.screenshot({
              path,
              clip: {
                x: rect.left - padding,
                y: rect.top - padding,
                width: rect.width + padding * 2,
                height: rect.height + padding * 2
              }
            });
          }

          await screenshotDOMElement({
            path: 'element.png',
            selector: '.infobox',
            padding: 16
          }).then(() => {
            channel.send(`<${wikiurl}${name}>`, {
              files: [{attachment: './element.png', name: `${name}.png`}],
            });
          });

          browser.close();
        })();

      }
    } else {
      console.log(err);
    }
  });
}

function parseStatus(body, channel) {
  const root = HTMLParser.parse(body);
  const div = root.querySelector('#status');

  let status = '';
  for (let i = 0; i < div.childNodes.length; i++) {
    if (i % 2 > 0) {
      let text = div.childNodes[i].childNodes[0].text;
      text = text.replace(/\s\s+/g, ' ');
      text = text.replace(' up', ' **up**');
      console.log(text);
      status += text;
      status += '\n';
    }
  }
  channel.send(status);
}

function forageChance(name, channel) {
  for (let i = 0; i < forage.length; i++) {
    if (forage[i].name.toLowerCase() === name.toLowerCase()) {
      let message = `The base PER EXP for **${name}** is ${forage[i].base}.\nYou'll start seeing it at **${forage[i].base / 2}**, and see all of it at **${forage[i].base * 2}**.`;
      channel.send(message);
      return;
    }
  }
  channel.send(`I didn't find a forageable named **${name}**. For a list of forageables say **!forage list** `);
}

function forageList(channel) {
  let message = '';
  for (let f of forage) {
    message += `${f.name}, `;
  }
  message = message.substring(0, message.length - 2);
  message += '.';
  channel.send(message);
}

function forageListChance(per, exp, channel) {
  const val = per * exp;
  let fields = [];
  for (let i = 0; i < forage.length; i++) {
    let chance = Math.round(100 * (2 * val - forage[i].base) / (3 * forage[i].base));
    if (chance <= 0) {
      continue;
    }
    if (chance > 100) chance = 100;

    fields[i] = {
      name: forage[i].name,
      value: `${chance}%`,
      inline: true
    };
  }

  sendMultipartMessage(fields, channel);

}

function gildList(args, channel, list) {
  if (args.toLowerCase() === 'ua') args = 'unarmed combat';
  if (args.toLowerCase() === 'mc') args = "melee combat";
  if (args.toLowerCase() === 'str') args = "strength";
  if (args.toLowerCase() === 'agi') args = "agility";
  if (args.toLowerCase() === 'int') args = "intelligence";
  if (args.toLowerCase() === 'psy') args = "psyche";
  if (args.toLowerCase() === 'per') args = "perception";

  let fields = [];
  for (let i = 0; i < list.length; i++) {
    if (list[i].gild1.toLowerCase().includes(args.toLowerCase()) ||
      list[i].gild2.toLowerCase().includes(args.toLowerCase()) ||
      list[i].gild3.toLowerCase().includes(args.toLowerCase()) ||
      list[i].gild4.toLowerCase().includes(args.toLowerCase())) {

      let values = [list[i].gild1, list[i].gild2, list[i].gild3, list[i].gild4].filter(Boolean).join(', ');

      fields.push({
        name: list[i].name,
        value: `${values}`
      });
    }
  }

  console.log(fields.length);
  if (fields.length === 0) {
    channel.send(`Couldn't find any gildings with attribute **${args}**`);
  } else {
    sendMultipartMessage(fields, channel);
  }

}

function sendMultipartMessage(fields, channel) {
  if (fields.length <= 25) {

    let embed = {
      fields: fields
    };

    channel.send({embed});

  } else if (fields.length <= 50) {

    let embed1 = {
      fields: fields.slice(0, 25)
    };

    let embed2 = {
      fields: fields.slice(25, fields.length)
    };

    channel.send({embed: embed1}).then(() => {
      channel.send({embed: embed2});
    });

  } else {
    let embed1 = {
      fields: fields.slice(0, 25)
    };

    let embed2 = {
      fields: fields.slice(25, 50)
    };

    let embed3 = {
      fields: fields.slice(50, fields.length)
    };

    channel.send({embed: embed1}).then(() => {
      channel.send({embed: embed2}).then(() => {
        channel.send({embed: embed3});
      });
    });
  }
}

function sendHelp(channel) {
  const embed = new Discord.MessageEmbed()
    .setTitle(help.title)
    .addFields(help.fields);

  channel.send(embed);
}

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

// require('http').createServer().listen(3000);
