/* eslint-disable no-console */
import { AkairoClient, CommandHandler, ListenerHandler, InhibitorHandler } from 'discord-akairo'
import { User, Message, ActivityType, ActivityOptions, Presence, Collection, Snowflake } from 'discord.js'
import WeebWrapper from '@tmuniversal/weeb-wrapper'
import * as path from 'path'
import DBL from 'dblapi.js'
import { WebhookLogger } from '../structures/WebhookLogger'
import configFile from '../config'
import appRootPath from 'app-root-path'
import CustomEventEmitter from '../structures/CustomEventEmitter'
import StatusUpdater from '@tmware/status-rotate'
import CounterManager from '../structures/CounterManager'

export interface BotOptions {
  token?: string
  owners?: string | string[]
}

export default class BotClient extends AkairoClient implements AkairoClient {
  public config: BotOptions
  public wrapper?: WeebWrapper
  public dbl?: DBL
  public statusUpdater: StatusUpdater
  public logger: WebhookLogger
  public eventEmitter: CustomEventEmitter
  public counter: CounterManager

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
    handleEdits: false,
    commandUtil: true,
    commandUtilLifetime: 1.5 * 60 * 1000,
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

  /**
   * Collection of all messages that initiated a 'steal' command
   */
  public activeStealCommands = new Collection<Snowflake, Message>()

  public constructor (config: BotOptions) {
    super({
      ownerID: config.owners,
      presence: {
        status: 'idle',
        activity: { name: 'Starting up...', type: 'PLAYING' }
      },
      messageCacheLifetime: 600,
      messageSweepInterval: 1200
    })

    console.log('[Client]', 'Initializing...')

    this.config = config
    this.logger = WebhookLogger.instance
    this.eventEmitter = CustomEventEmitter.instance
    this.counter = CounterManager.instance
    this.statusUpdater = new StatusUpdater(this, 'https://gist.githubusercontent.com/TMUniversal/253bd3172c3002be3e15e1152dd31bd4/raw/emojiStealerStatuses.json')
    this.statusUpdater.updateParserData({ website: 'tmuniversal.eu', prefix: configFile.prefix, version: configFile.version })

    if (configFile.weebToken && configFile.weebToken?.length !== 0) {
      this.wrapper = new WeebWrapper(configFile.weebToken, 'https://api.tmuniversal.eu')
    } else {
      this.wrapper = null
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
    // tslint:disable-next-line: tsr-detect-non-literal-regexp
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
    console.log('[Bot]', 'Starting up...')
    await this._init()
    await this.login(this.config.token)

    // Register event handling for custom events
    this.eventEmitter.on('updateStats', () => this.updateStats())
    this.eventEmitter.on('logCommand', command => this.logCommandToApi(command))
    this.eventEmitter.on('changeStatus', () => this.changeStatus())

    // Automate status changes and upload stat uploads.
    this.setInterval(() => this.eventEmitter.emit('changeStatus'), 5 * 60 * 1000) // every five minutes
    this.setInterval(() => this.eventEmitter.emit('updateStats'), 20 * 60 * 1000) // every twenty minutes

    return this
  }

  // Function for (randomized) status changes
  public async changeStatus (options?: ActivityOptions): Promise<Presence> {
    this.statusUpdater.updateParserData({ emojis: await this.counter.getEmojiCount(), pfps: await this.counter.getPfpCount() })
    if (options) return this.statusUpdater.updateStatus(options)
    return this.statusUpdater.updateStatus()
  }

  public async updateStats () {
    if (this.wrapper) this.updateBotStats(this.guilds.cache.size, this.channels.cache.size, this.users.cache.size)
    if (this.dbl) this.dbl.postStats(this.guilds.cache.size)
  }

  // Upload user stats to api
  public async updateBotStats (guilds: number, channels: number, users: number) {
    if (!this.wrapper) return Promise.resolve(this.logger.warn('API', 'Cannot upload bot stats: API is disabled'))
    return this.wrapper.statistics.updateBot(this.user.id, guilds, channels, users)
      .then((r) => {
        return this.logger.silly('BotStat', '[Upload]', `Uploaded user base stats to API: ${r.guilds} guilds, ${r.channels} channels, ${r.users} users.`)
      })
      .catch(err => this.logger.error('BotStat', err))
  }

  // Upload command usage stats to api
  public async logCommandToApi (command: string) {
    if (!this.wrapper) return Promise.resolve(this.logger.warn('API', 'Cannot upload command stats: API is disabled', command))
    return this.wrapper.statistics.increaseCommandUsage(this.user.id, command)
      .then((result) => {
        return this.logger.silly('BotStat', '[Upload]', `Command has been updated: ${result.command} was used ${result.uses} times.`)
      }).catch((err) => {
        return this.logger.error('BotStat', err)
      })
  }

  public stop () {
    this.logger.warn('PROCESS', 'Received exit signal => quitting in 4 seconds...')
    this.destroy()
    this.updateStats()
    this.counter.destroy()
    setTimeout(() => {
      this.logger.warn('PROCESS', 'Exit.')
      process.exit(0)
    }, 4000)
  }
}
