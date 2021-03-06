# Emoji Stealer
<div>
  <p align="center">
    <a href="https://github.com/TMUniversal/Emoji-Stealer/blob/master/package.json#L3">
      <img src="https://img.shields.io/github/package-json/v/TMUniversal/Emoji-Stealer?style=flat&color=c4c4c4" />
    </a>
    <a href="https://top.gg/bot/726731461310545920" >
      <img src="https://top.gg/api/widget/status/726731461310545920.svg?noavatar=true" alt="Emoji Stealer" />
    </a>
    <a href="https://top.gg/bot/726731461310545920" >
      <img src="https://top.gg/api/widget/servers/726731461310545920.svg?noavatar=true" alt="Emoji Stealer" />
    </a>
    <a href="https://tmuniversal.eu/redirect/discord">
      <img src="https://img.shields.io/discord/727551682090762280.svg?style=flat&logo=discord">
    </a>
    <a href="https://tmuniversal.eu/redirect/patreon">
      <img src="https://img.shields.io/badge/Patreon-support_me-fa6956.svg?style=flat&logo=patreon" />
    </a>
    <br />
    <a href="https://github.com/TMUniversal/Emoji-Stealer/actions">
      <img src="https://github.com/TMUniversal/Emoji-Stealer/workflows/Test/badge.svg" />
    </a>
    <a href="https://www.codacy.com/manual/Uni/Emoji-Stealer?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=TMUniversal/Emoji-Stealer&amp;utm_campaign=Badge_Grade">
      <img src="https://app.codacy.com/project/badge/Grade/5d164400a96e44f1bac77bcdfeb1f883"/>
    </a>
    <a href="https://github.com/TMUniversal/Emoji-Stealer/issues">
      <img src="https://img.shields.io/github/issues/TMUniversal/Emoji-Stealer.svg?style=flat">
    </a>
    <a href="https://github.com/TMUniversal/Emoji-Stealer/graphs/contributors">
      <img src="https://img.shields.io/github/contributors/TMUniversal/Emoji-Stealer.svg?style=flat">
    </a>
    <a href="https://github.com/TMUniversal/Emoji-Stealer/blob/stable/LICENSE.md">
      <img src="https://img.shields.io/github/license/TMUniversal/Emoji-Stealer.svg?style=flat">
    </a>
  </p>
</div>

# Getting Started

[Emoji Stealer] is a Discord Bot that allows it's users to copy custom emojis from other guilds. Without downloads.

To use this bot: [invite](https://discord.com/api/oauth2/authorize?client_id=726731461310545920&permissions=1074072576&scope=bot) it to your server, or host it yourself.

## Installation

Assuming you have [Node.js](https://nodejs.org/en/download/current/) installed, install the required packages:
> Please use the latest version on Node.js, as this project is constantly keeping up to date.
> Emoji Stealer is built and tested with the latest version of Node.js

- In the project folder: `npm install`

##### Potential issues during installation
On linux you may need additional dependencies for the image compression packages imagemin and addons. Not individually installing the [`imagemin`] packages has lead to errors on Ubuntu, see this [issue](https://github.com/TMUniversal/Emoji-Stealer/issues/31#issuecomment-664607038).

## Setup

- Make a copy of [`data.example.json`], name it `data.json`.
- Fill in the necessary values, remove the comment (since comments are not supported in JSON).
  - `owners` may be an array of strings


```JS
  {
    "clientToken": "<Discord Bot Token>",
    "webhook": {
      "id": "",
      "secret": ""
    },
    "weebToken": "<Token>",  // Closed API. Request key (more info on website) or leave empty
    "dblToken": "<Another token>", // Your top.gg api key. Used to upload stats.
    "prefix": ">",
    "owners": "<Your Discord ID>",
    // OR
    "owners": ["<Your Discord ID>", "<Another Discord ID>"],
    "userBlacklist": ["<some id>"], // users that cannot use commands
    "counter": { // naming your emoji counters
      "namespace": "",
      "emojiKey": "",
      "pfpKey": ""
    }
  }
```

## Starting

To start the bot, it must first be complied.

- Run `npm run build`
- You may then start with `npm start` or, if you have pm2 installed: `pm2 start pm2-start.json`
- Alternatively: Run `npm run cs` to build and then start.

`npm run startmon` will launch the bot in monitor mode, i.e. it will reload anytime you save a file (unfit for production environments).

# Using the bot

## Commands

### Basic

To get help or view information about this bot.

`>help` Shows a list of commands

`>help [command]` Shows help for a specific command

`>about` Information about this bot

`>invite` Generate an invite link, so you can invite this bot to your server

### Copying Emojis

`>steal` Will open up a menu that explains the process.

To steal emojis, simply react to the message the bot sends with the custom emojis you want on your server.

<details>

<summary>Image guide. (click to open)</summary>

<img src="https://i.imgur.com/fs8jicD.png" />

<img src="https://i.imgur.com/fh4ZGeZ.png?1" />

<img src="https://i.imgur.com/kGpbUe4.png" />

<img src="https://i.imgur.com/IZTFiIA.png" />

</details>

`>pfp [@user]` Will upload the profile picture of the mentioned user as an emoji _(mentioning a user is optional, if omitted this will upload your own profile picture)_

# Credits

Credits to [Hydractify] for their logging system.

# License

Emoji Stealer is released under the [MIT License](LICENSE.md).


<!-- Getting started -->

[Emoji Stealer]: https://github.com/TMUniversal/Emoji-Stealer

<!-- Installation -->

[`imagemin`]: https://www.npmjs.com/package/imagemin

<!-- Setup -->

[`data.example.json`]: https://github.com/TMUniversal/Emoji-Stealer/blob/master/data.example.json

<!-- Credits -->

[Hydractify]: https://github.com/Hydractify/kanna_kobayashi
