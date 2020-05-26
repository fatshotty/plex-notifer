const {PlexLibrary} = require('./plex');
const {Config} = require('./utils');
const CronJob = require('cron').CronJob;
const Templates = require('./templates/index');
const Path = require('path');
const EventEmitter = require('events');
const {Worker} = require('worker_threads');

const Scraper = require('./scraper/scraper');

const TelegramBot = require('./telegram-bot');

const SCRAPERS = ['TMDB', 'TVDB'];


const startProcess = require('./db_worker');


class Job extends EventEmitter {


  get JobName() {
    return `[${this.plexlibrary.Name} (${this.plexlibrary.Key})]`;
  }

  constructor(options) {
    super();
    this.options = options;
    this.init();
  }


  init() {

    this.plexlibrary = new PlexLibrary( this.options );

    this._job = new CronJob(
      this.options.jobschedule,    // schedule
      this.execute.bind(this),     // onTick
      null,                        // onComplete
      false,                       // start
      'Europe/Amsterdam'           // timeZone
    );

    // this.spawnThread();
  }

  spawnThread() {
    this.Worker = new Worker('./db_worker.js', {stdin: true, stdout: false, stderr: false});
    this.Worker.on('exit', (code) => {
      console.log(`[WARN] ${this.JobName} - Worker is exited: ${code}`);
      this.spawnThread();
    });
    this.Worker.on('message', (data) => {
      console.log(`${this.JobName} Worker - received data ${data.length}`);
    });
  }

  sendToThread(items) {
    try {
      // this.Worker.postMessage({JOB: this.JobName, items});
      startProcess({JOB: this.JobName, items});
    } catch( e ) {
      console.log(`[ERROR] ${this.JobName} - cannot send to thread: ${e.message}`);
    }
  }


  start() {
    this._job.start();

    if ( Config.IMMEDIATE ) {
      console.log(`[WARN] job ${this.plexlibrary.Name} - ${this.plexlibrary.Key} will start now!`);
      this.execute();
    }
  }


  execute() {

    if ( this.isExecuting ) {
      console.log(`${this.JobName} is already running, skipping`);
      return;
    }

    this.isExecuting = true;

    console.log(`${this.JobName} job is starting...`);

    this.plexlibrary.filterRecentlyAdded().then( (items) => {

      console.log(`${this.JobName} ${items.length} recently added`);

      this.emit('gotitems', items);

      return items;

    })

    .then( (items) => {
      // GOT items details
      // scrape via TMDB/TVDB

      // TODO: scrape

      if ( Config.PLEX_LIBRARY_SKIP_SCRAPE.indexOf( this.plexlibrary.Key) > -1 ) {
        console.log(`${this.JobName} skip scraper`);
        return items.map( i => ({plexItem: i}) );
      }

      let ps = [];
      let _scraper_type = 'movie';

      if ( this.plexlibrary.Type == 'show' ) {
        _scraper_type = 'tv';
      }

      for ( let plexItem of items ) {
        ps.push( this.scrape( plexItem, _scraper_type ) );
      }

      return ps.length ? Promise.all(ps) : [];
    })


    // spawn thread
    .then( (items) => {


      this.sendToThread(items);


      return items;
    })

    // .then( (items) => {

    //   // GOT data scraped
    //   // Compile template

    //   let ps = [];
    //   for ( let item of items ) {
    //     let obj = {
    //       plexItem: item.plexItem || {},
    //       scraped: item.scraped || {}
    //     };
    //     try {
    //       console.log(`${this.JobName} try to notify - ${obj.scraped.Name || item.plexItem.title}`);
    //       let compiledTemplate = Templates[`template_${this.plexlibrary.Key}`](obj, this.plexlibrary);
    //       ps.push(  compiledTemplate ); // Promise.resolve({poster: obj.scraped.Poster, html: compiledTemplate}) );
    //     } catch( e ) {
    //       console.log(`[ERROR pug] ${this.JobName} ${e.message}`);
    //     }

    //   }

    //   return Promise.all(ps);
    // })

    // .then( (templates) => {

    //   let ps = [];
    //   for ( let template of templates ) {

    //     // console.log(`**** template ****`);
    //     // console.log(template.html);

    //     if ( TelegramBot.Enabled ) {

    //       ps.push( TelegramBot.publish( template.poster, template.html ) );

    //     } else {
    //       ps.push( new Promise( (resolve, reject) => {
    //         console.log(`**** ${this.JobName} `);
    //         console.log( template.html );
    //         resolve();
    //       }) )
    //     }

    //   }


    //   return Promise.all( ps );

    // })

    .then( () => {
      this.onComplete(null);
    })

    .catch( (e) => {
      this.onComplete(e);
    });


  }

  scrape(plexItem, type) {

    let scrapeIndex = -1;

    return new Promise( (resolve, reject) => {

      let fn_scrape = () => {
        let scraper = SCRAPERS[ ++scrapeIndex ];
        if ( !scraper ) {
          console.log(`${this.JobName} scraping ${plexItem.title} (${plexItem.year}) no more scraper`);
          return resolve( {scraped: null, plexItem} );
        }
        console.log(`${this.JobName} scraping ${plexItem.title} (${plexItem.year}) via ${scraper} (addedAt: ${plexItem.addedAt})`);
        return Scraper[ scraper ].search(plexItem.title, plexItem.year, type).then( (scraperdata) => {
          let results = scraperdata.results;
          let first = results[0];
          if ( first ) {
            Scraper[ scraper ].getInfo(first.id, type).then( (klass) => {
              resolve( {scraped: klass, plexItem} );
            })
          } else {
            // force to catch error on 'catch' function
            throw new Error(`not found on ${scraper}`);
          }
        }).catch( (e) => {
          console.error( `${this.JobName} - ${plexItem.title} (${plexItem.year}) ${e.message}` );
          fn_scrape();
        });
      }

      fn_scrape();
    });

  }

  onComplete(error) {
    this.isExecuting = false;

    if ( error ) {
      console.error(error);

      console.log(`[ERROR] ${this.JobName} job finished with error ${error.message}`);
    } else {
      console.log(`${this.JobName} job is successfully completed`);
    }

    this.emit('completed', error);

  }


}


module.exports = Job;
