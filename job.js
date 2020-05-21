const {PlexLibrary} = require('./plex');
const {Config} = require('./utils');
const CronJob = require('cron').CronJob;
const Templates = require('./templates/index');
const Path = require('path');
const EventEmitter = require('events');

const Scraper = require('./scraper/scraper');

const TelegramBot = require('./telegram-bot');


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
      let _scraper = 'TMDB';
      let _scraper_type = 'movie';

      if ( this.plexlibrary.Type == 'show' ) {
        _scraper = 'TVDB';
        _scraper_type = 'tv';
      }

      for ( let plexItem of items ) {
        console.log(`${this.JobName} scraping ${plexItem.title} (${plexItem.year}) via ${_scraper} (addedAt: ${plexItem.addedAt})`);
        ps.push( new Promise( (resolve, reject) => {
          Scraper[ _scraper ].search(plexItem.title, plexItem.year, _scraper_type).then( (tmdbData) => {
              let results = tmdbData.results;
              let first = results[0];
              if ( first ) {
                Scraper[ _scraper ].getInfo(first.id, _scraper_type).then( (klass) => {
                  resolve( {scraped: klass, plexItem} );
                }).catch( (e) => {
                  console.error(`[ERROR ${_scraper}-info-${this.plexlibrary.Key}] ${this.JobName} ${e.message} [${plexItem.title} (${plexItem.year})]`);
                  resolve( {scraped: null, plexItem} );
                })
              } else {
                console.warn(`${this.JobName} - 0 results scraped for ${plexItem.title} (${plexItem.year})`);
                resolve( {scraped: null, plexItem} );
              }
            }).catch( (e) => {
              console.error(`[ERROR ${_scraper}-search-${this.plexlibrary.Key}] ${this.JobName} ${e.message} [${plexItem.title} (${plexItem.year})]`);
              resolve( {scraped: null, plexItem} );
            })
          })
        );
      }

      return ps.length ? Promise.all(ps) : [];
    })

    .then( (items) => {

      // GOT data scraped
      // Compile template

      let ps = [];
      for ( let item of items ) {
        let obj = {
          plexItem: item.plexItem || {},
          scraped: item.scraped || {}
        };
        try {
          console.log(`${this.JobName} try to notify - ${obj.scraped.Name || item.plexItem.title}`);
          let compiledTemplate = Templates[`template_${this.plexlibrary.Key}`](obj, this.plexlibrary);
          ps.push(  compiledTemplate ); // Promise.resolve({poster: obj.scraped.Poster, html: compiledTemplate}) );
        } catch( e ) {
          console.log(`[ERROR pug] ${this.JobName} ${e.message}`);
        }

      }

      return Promise.all(ps);
    })

    .then( (templates) => {

      let ps = [];
      for ( let template of templates ) {

        // console.log(`**** template ****`);
        // console.log(template.html);

        if ( TelegramBot.Enabled ) {

          ps.push( TelegramBot.publish( template.poster, template.html ) );

        } else {
          ps.push( new Promise( (resolve, reject) => {
            console.log(`**** ${this.JobName} `);
            console.log( template.html );
            resolve();
          }) )
        }

      }


      return Promise.all( ps );

    })

    .then( () => {
      this.onComplete(null);
    })

    .catch( (e) => {
      this.onComplete(e);
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
