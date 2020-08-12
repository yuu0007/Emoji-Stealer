import { AkairoClient, CommandHandler, ListenerHandler, InhibitorHandler } from 'discord-akairo'
import { User, Message, ActivityType, ActivityOptions, Presence } from 'discord.js'
import WeebWrapper from '@tmuniversal/weeb-wrapper'
import * as path from 'path'
import DBL from 'dblapi.js'
import { WebhookLogger } from '../structures/WebhookLogger'
import configFile from '../config'
import appRootPath from 'app-root-path'
import CustomEventEmitter from '../structures/CustomEventEmitter'
import VariableParser from '../util/VariableParser'
import StatusUpdater from '../structures/StatusUpdater'
import Counter from '../structures/Counter'

declare module 'discord-akairo' {
  interface AkairoClient {
    commandHandler: CommandHandler;
    listenerHandler: ListenerHandler;
    inhibitorHandler: InhibitorHandler;
    config: BotOptions;
    logger: WebhookLogger;
    wrapper?: WeebWrapper;
    botstat?: WeebWrapper['statistics'];
    dbl?: DBL;
    variableParser: VariableParser;
    statusUpdater: StatusUpdater;
    customEmitter: CustomEventEmitter;
    counter: Counter;

    start(): Promise<BotClient>;
    changeStatus(): Promise<Presence>;
    updateBotStats(guilds: number, channels: number, users: number): Promise<void>;
  }
}

interface BotOptions {
  token?: string;
  owners?: string | string[];
}

export default class BotClient extends AkairoClient {
  public config: BotOptions;
  public wrapper?: WeebWrapper;
  public botstat?: WeebWrapper['statistics'];
  public dbl?: DBL;
  public statusUpdater: StatusUpdater;
  public variableParser: VariableParser;
  public logger: WebhookLogger;
  public eventEmitter: CustomEventEmitter;
  public counter: Counter;

  public listenerHandler: ListenerHandler = new ListenerHandler(this, {
    directory: path.join(__dirname, '..', 'events')
  })

  public inhibitorHandler: InhibitorHandler = new InhibitorHandler(this, {
    directory: path.join(__dirname, '..', 'inhibitors')
  })

  public commandHandler: CommandHandler = new CommandHandler(this, {
    directory: path.join(__dirname, '..', 'commands'),
    prefix: configFile.prefix,
    allowMention: true,
    handleEdits: true,
    commandUtil: true,
    commandUtilLifetime: 2 * 60 * 1000,
    defaultCooldown: 6e3,
    argumentDefaults: {
      prompt: {
        modifyStart: (_: Message, str: string): string => `${str}\n\nType \`cancel\` to cancel this command...`,
        modifyRetry: (_: Message, str: string): string => `${str}\n\nType \`cancel\` to cancel this command...`,
        timeout: 'You have kept me waiting too long.',
        ended: 'Exceeded maximum amount of attempts, cancelling....',
        retries: 3,
        time: 3e4
      },
      otherwise: ''
    },
    ignoreCooldown: configFile.owners,
    ignorePermissions: configFile.owners
  })

  public constructor (config: BotOptions) {
    super({
      ownerID: config.owners
    })

    this.config = config
    this.logger = WebhookLogger.instance
    this.eventEmitter = CustomEventEmitter.instance
    this.counter = Counter.instance
    this.variableParser = new VariableParser({ website: 'tmuniversal.eu', prefix: configFile.prefix })
    this.statusUpdater = new StatusUpdater(this, this.variableParser, 'https://pastebin.com/raw/UDWZ0eZZ')

    if (configFile.weebToken && configFile.weebToken?.length !== 0) {
      this.wrapper = new WeebWrapper(configFile.weebToken, 'https://api.tmuniversal.eu')
      this.botstat = this.wrapper.statistics
    } else {
      this.wrapper = this.botstat = null
    }

    if (configFile.dblToken && configFile.dblToken.length !== 0) {
      this.dbl = new DBL(configFile.dblToken)
    }
  }

  private async _init (): Promise<void> {
    this.commandHandler.useListenerHandler(this.listenerHandler)
    this.commandHandler.useInhibitorHandler(this.inhibitorHandler)
    this.listenerHandler.setEmitters({
      commandHandler: this.commandHandler,
      listenerHandler: this.listenerHandler,
      process
    })

    // Load handler sub-modules
    this.inhibitorHandler.loadAll()
    this.commandHandler.loadAll()
    this.listenerHandler.loadAll()

    // Error handlers
    // Regex to match the root path of the project. Escapes path separators on windows and linux
    const pathRegex = new RegExp(path.normalize(appRootPath.toString()).replace(/\\/g, '\\\\').replace(/\//g, '\\/'), 'gmi')

    this.on('error', e => this.logger.error('CLIENT', e.message))
    this.on('warn', w => this.logger.warn('CLIENT', w))

    //  Process handling / do not crash on error
    process.once('SIGINT', () => this.stop())
    process.once('SIGTERM', () => this.stop())
    process.on('uncaughtException', (err: Error) => {
      const errorMsg = (err ? err.stack || err : '').toString().replace(pathRegex, '.')
      this.logger.error('EXCEPTION', errorMsg)
    })
    process.on('unhandledRejection', (err: Error) => {
      const errorMsg = (err ? err.stack || err : '').toString().replace(pathRegex, '.')
      this.logger.error('REJECTION', 'Uncaught Promise error: \n' + errorMsg)
    })
  }

  public async start (): Promise<BotClient> {
    // eslint-disable-next-line no-console
    console.log('Starting the bot...')
    await this._init()
    await this.login(this.config.token)

    // Register event handling for custom events
    this.eventEmitter.on('updateStats', () => this.updateStats())
    this.eventEmitter.on('logCommand', command => this.logCommandToApi(command))
    this.eventEmitter.on('changeStatus', () => this.changeStatus())

    // Set a startup notice. This will be overridden upon ready.
    this.user.setActivity({ name: 'Starting up...', type: 'PLAYING' })

    // Automate status changes and upload stat uploads.
    this.setInterval(() => this.eventEmitter.emit('changeStatus'), 5 * 60 * 1000) // every five minutes
    this.setInterval(() => this.eventEmitter.emit('updateStats'), 20 * 60 * 1000) // every twenty minutes

    await this.updateStats()

    return this
  }

  // Function for (randomized) status changes
  public async changeStatus (options?: ActivityOptions): Promise<Presence> {
    if (options) return this.statusUpdater.updateStatus(options)
    return this.statusUpdater.updateStatus()
  }

  public async updateStats () {
    if (this.botstat) this.updateBotStats(this.guilds.cache.size, this.channels.cache.size, this.users.cache.size)
    if (this.dbl) this.dbl.postStats(this.guilds.cache.size)
  }

  // Upload user stats to api
  public async updateBotStats (guilds: number, channels: number, users: number) {
    if (!this.botstat) return Promise.resolve(this.logger.warn('API', 'Cannot upload bot stats: API is disabled'))
    return this.botstat.updateBot(this.user.id, guilds, channels, users)
      .then((r) => {
        return this.logger.silly(`Uploaded user base stats to API: ${r.guilds} guilds, ${r.channels} channels, ${r.users} users.`)
      })
      .catch(err => this.logger.error('BotStat', err))
  }

  // Upload command usage stats to api
  public async logCommandToApi (command: string) {
    if (!this.botstat) return Promise.resolve(this.logger.warn('API', 'Cannot upload command stats: API is disabled', command))
    return this.botstat.increaseCommandUsage(this.user.id, command)
      .then((result) => {
        return this.logger.silly(`Command has been updated: ${result.command} was used ${result.uses} times.`)
      }).catch((err) => {
        return this.logger.error('BotStat', err)
      })
  }

  public stop () {
    this.logger.warn('PROCESS', 'Received exit signal => quitting in 3 seconds...')
    this.destroy()
    this.updateStats()
    this.counter.destroy()
    setTimeout(() => {
      this.logger.debug('PROCESS', 'Exit.')
      process.exit(0)
    }, 5000)
  }
}
