const {PlexQuery} = require('./plex');
const {Config} = require('./utils');
const CronJob = require('cron').CronJob;
const TelegramBot = require('./telegram-bot');
const EventEmitter = require('events');
const Chokidar = require('chokidar');
const Path = require('path');
const FS = require('fs');
const Templates = require('./templates/index');
const ChildProcess = require('child_process');
const GOT = require('got');
const {Tail} = require('tail');
const LIMIT_LOOP = 6;
const LIMIT_LOOP_SECONDS = 10;


class HealthCheck extends EventEmitter {

  timerNotifyForUsers = null;
  userNotificationMountedFolder = null;

  tailRclone = null;

  get RootFolderToWatch() {
    return Path.join(Config.ROOT_MEDIA_FOLDER, '../');
  }

  get JobName() {
    return `[HEALTH]`;
  }

  constructor(options) {
    super();
    this.options = options;

    this.RootFolderMounted = this.checkMounted();
    this.userNotificationMountedFolder = this.RootFolderMounted;

    this.init();
  }


  checkMounted() {
    let folder = Config.ROOT_MEDIA_FOLDER;
    try {
      return FS.existsSync(folder);
    } catch(e) {
      console.log(this.JobName, 'folder exists error', e);
      return false;
    }
  }


  init() {

    this._job = new CronJob(
      this.options.jobschedule,    // schedule
      this.execute.bind(this),     // onTick
      null,                        // onComplete
      false,                       // start
      'Europe/Amsterdam'           // timeZone
    );

  }


  start() {
    this._job.start();

    if ( Config.IMMEDIATE ) {
      console.log(`[WARN] job ${this.JobName} will start now!`);
      this.execute();
    }

    let basepath = this.RootFolderToWatch;

    this.Watcher = Chokidar.watch( basepath , {
      persistent: false,
      followSymlinks: false,
      usePolling: true,
      awaitWriteFinish: false,
      depth: 0,
    });

    this.Watcher.on('ready', () => {
      console.log(this.JobName, 'watcher is ready on', basepath);
      this.bindWatcherEvents();
    });

    if ( this.tailRclone ) {
      this.tailRclone.unwatch();
    }

    if ( TelegramBot.BotAdminEnabled ) {
      if ( Config.RCLONE_LOG_FILE && Config.RCLONE_LOG_ERROR_KEYS ) {

        try {
          this.tailRclone = new Tail(Config.RCLONE_LOG_FILE, {follow: true});
        } catch(e) {
          console.error('[HEALTH] Rclone: no tail job started', e);
          TelegramBot.sendError(`[HEALTH]:` , new Error('no tail-log has started') );
        }

        this.tailRclone.on("line", function(data) {
          if ( data.indexOf( Config.RCLONE_LOG_ERROR_KEYS ) > -1 ) {
            console.warn(`[HEALTH] Rclone tail notifier:`, data);
            TelegramBot.sendError(`[HEALTH]:` , new Error(data) );
          }
        });

        this.tailRclone.on("error", function(error) {
          console.error(`[HEALTH] Rclone tail error:`, error);
          TelegramBot.sendError(`[RCLONE]-ERR:` , new Error(error) );
        });

        console.log('[HEALTH] Rclone tail job has correctly started');
      }

    }

  }

  bindWatcherEvents() {
    let tmrMount = null;
    let tmrUMount = null;
    this.Watcher.on('addDir', (evt, data) => {
      if ( tmrMount ) {
        clearTimeout(tmrMount);
      }
      tmrMount = setTimeout( this.checkMountReMount.bind(this, false), 1000);
    });

    this.Watcher.on('unlinkDir', (evt, data) => {
      if ( tmrUMount ) {
        clearTimeout(tmrUMount);
      }
      tmrUMount = setTimeout( this.checkMountReMount.bind(this, false), 1000);
    });
  }


  checkMountReMount(admin) {

    console.log(this.JobName, '...check mounting fo folder...');

    const folderIsMounted = this.checkMounted();
    if ( String(folderIsMounted) == String(this.RootFolderMounted) ) {
      console.log(this.JobName, 'folder IS NOT changed:', folderIsMounted ? 'MOUNTED' : 'UNMOUNTED');
      return;
    }

    if ( !admin ) {
      this.RootFolderMounted = folderIsMounted;
    }

    this.notifyUserChannel();

    console.log(this.JobName, 'folder seems to be changed: now it is', folderIsMounted ? 'MOUNTED' : 'UNMOUNTED');

    if ( TelegramBot.BotAdminEnabled ) {

      if ( folderIsMounted ) {
        TelegramBot.sendError(`mount folder OK` , new Error('correctly mounted') );
      } else {
        TelegramBot.sendError(`mount folder *FAIL*` , new Error('UNMOUNTED') );
      }


    } else {
      console.log(`**** ${this.JobName} telegram is not enabled`);
    }

  }


  notifyUserChannel() {

    const folderIsMounted = this.checkMounted();

    console.log(`${this.JobName} cancel User-notification-timer`);
    clearTimeout( this.timerNotifyForUsers );

    if ( String(this.userNotificationMountedFolder) !== String(folderIsMounted)  ) {

      console.log(`${this.JobName} start user-notification-timer`);

      this.timerNotifyForUsers = setTimeout( () => {

        // folder not change its state, we need to nitify users
        this.userNotificationMountedFolder = folderIsMounted;

        console.log(`**** ${this.JobName} Notify users about state of the mounted FOLDER:`, this.userNotificationMountedFolder ? 'MOUNTED' : 'UNMOUNTED');

        if ( TelegramBot.Enabled ) {

          let compiledTemplate = '';
          try {
            console.log(`${this.JobName} try to notify`);
            compiledTemplate = Templates[`template_${ folderIsMounted ? 'mounted' : 'umounted'  }`]();
          } catch( e ) {
            console.log(`[ERROR pug] ${this.JobName} ${e.message}`, e);
            if ( TelegramBot.BotAdminEnabled ) {
              TelegramBot.sendError( `Pug ${this.JobName} - cannot compile template ${ folderIsMounted ? 'MOUNTED' : 'UMOUNTED'  }`, e.stack);
              return;
            }
          }

          TelegramBot.publishHtml( compiledTemplate );

        } else {
          console.log(`**** ${this.JobName} telegram is not enabled`);
        }

      }, 1000 * 60 * 2);

    } else {
      console.log( 'Folder has not changed its state, so do not notify users. State is:', folderIsMounted ? 'MOUNTED' : 'UNMOUNTED' );
    }

  }


  execute() {

    this.numberOfLoop = LIMIT_LOOP;
    this.numberOfLoopEmby = LIMIT_LOOP;
    this._execute();

    this._executeEmby();

    this.checkMountReMount(true);

  }


  _execute() {
    PlexQuery('/system').then( (data) => {

      console.log(this.JobName, 'plex is running');

    }).catch( (err) => {

      console.warn(this.JobName, 'error checking Plex', err);

      console.warn(this.JobName, 'remaining', --this.numberOfLoop);

      if ( this.numberOfLoop <= 0 ) {
        console.error(this.JobName, 'plex is down, notifying');
        if ( TelegramBot.BotAdminEnabled ) {
          TelegramBot.sendError('! Plex seems Down !', err);
        }
        return;
      }

      setTimeout(this._execute.bind(this), LIMIT_LOOP_SECONDS * 1000);

    });
  }

  async _executeEmby() {

    try {
      await GOT('https://redprimerose-embybeta.edge.cbio.us/System/Info/Public');
      console.log(this.JobName, 'Emby is running');
    } catch(err) {
      console.warn(this.JobName, 'error checking Emby', err);

      console.warn(this.JobName, 'remaining', --this.numberOfLoopEmby);

      if ( this.numberOfLoopEmby <= 0 ) {
        console.error(this.JobName, 'Emby is down, notifying');
        if ( TelegramBot.BotAdminEnabled ) {
          TelegramBot.sendError('! Emby seems Down !', err);
        }
        return;
      }

      setTimeout(this._executeEmby.bind(this), LIMIT_LOOP_SECONDS * 1000);
    }
  }


  createAdminButtonsForMountUnmount() {
    return [{text: 're-mount', action: 'mount'}];
  }
  callbackForMountUnmount(data) {
    if ( data == 'mount' ) {
      // spawn unmount and mount
      console.log(`try to umount-mount`);
      ChildProcess.exec(Config.REMOUNT_COMMAND, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          TelegramBot.sendError(`remount command` , new Error(String(error)) );
          return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        TelegramBot.sendError(`remount command` , new Error(stderr || stdout) );
      });
    }
  }

}


module.exports = HealthCheck;
