const {PlexQuery} = require('./plex');
const {Config} = require('./utils');
const CronJob = require('cron').CronJob;
const TelegramBot = require('./telegram-bot');
const EventEmitter = require('events');



const LIMIT_LOOP = 6;
const LIMIT_LOOP_SECONDS = 10;


class HealthCheck extends EventEmitter {


  get JobName() {
    return `[HEALTH]`;
  }

  constructor(options) {
    super();
    this.options = options;
    this.init();
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
  }


  execute() {


    this.numberOfLoop = LIMIT_LOOP;
    this._execute();


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

}


module.exports = HealthCheck;
