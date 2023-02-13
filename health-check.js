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

const LIMIT_LOOP = 6;
const LIMIT_LOOP_SECONDS = 10;


class HealthCheck extends EventEmitter {

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

    let folderIsMounted = this.checkMounted();
    if ( String(folderIsMounted) == String(this.RootFolderMounted) ) {
      console.log(this.JobName, 'folder IS NOT changed:', folderIsMounted ? 'MOUNTED' : 'UNMOUNTED');
      return;
    }

    if ( !admin ) {
      this.RootFolderMounted = folderIsMounted;
    }

    console.log(this.JobName, 'folder seems to be changed: now it is', folderIsMounted ? 'MOUNTED' : 'UNMOUNTED');

    let compiledTemplate = '';
    try {
      console.log(`${this.JobName} try to notify`);
      compiledTemplate = Templates[`template_${ folderIsMounted ? 'mounted' : 'umounted'  }`]();
    } catch( e ) {
      console.log(`[ERROR pug] ${this.JobName} ${e.message}`, e);
      if ( TelegramBot.Enabled ) {
        TelegramBot.sendError( `Pug ${this.JobName} - cannot compile template ${ folderIsMounted ? 'MOUNTED' : 'UMOUNTED'  }`, e.stack);
        return;
      }
    }


    if ( TelegramBot.Enabled ) {
      if (!admin) {
        TelegramBot.publishHtml( compiledTemplate );
        // force admin=true in order to send action into monitor-chat
        admin = true;
      }

      if ( admin ) {

        if ( folderIsMounted ) {
          TelegramBot.sendError(`mount folder OK` , new Error('correctly mounted') );
        } else {
          let title = `mount folder *FAIL*`, msg = 'UNMOUNTED';

          let buttons = this.createAdminButtonsForMountUnmount();

          TelegramBot.callbackMessage(title, msg, buttons, this.callbackForMountUnmount.bind(this) );
        }

      }
    } else {
      console.log(`**** ${this.JobName} `);
      console.log( compiledTemplate );
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
        return TelegramBot.sendError('! Plex seems Down !', err);
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
        return TelegramBot.sendError('! Emby seems Down !', err);
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
