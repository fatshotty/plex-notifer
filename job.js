const {PlexLibrary} = require('./plex');
const {Config} = require('./utils');
const CronJob = require('cron').CronJob;
const Templates = require('./templates/index');
const Path = require('path');
const EventEmitter = require('events');

const Scraper = require('./scraper/scraper');

const TelegramBot = require('./telegram-bot');


class Job extends EventEmitter {


  constructor(options) {
    super();
    this.options = options;
    this.init();
  }


  init() {

    this.plexlibrary = new PlexLibrary({
      key: this.options.key,
      lastScan: this.options.lastScan,
      type: this.options.type
    });

    this._job = new CronJob(
      this.options.jobschedule,       // schedule
      this.execute.bind(this),     // onTick
      null,                        // onComplete
      false,                       // start
      'Europe/Amsterdam'           // timeZone
    );
  }


  start() {
    this._job.start();
    // this.execute();
  }


  execute() {

    if ( this.isExecuting ) {
      console.log(`job ${this.plexlibrary.Type} is already running, skipping`);
      return;
    }

    this.isExecuting = true;

    this.plexlibrary.filterRecentlyAdded().then( (items) => {

      console.log(`${items.length} ${this.plexlibrary.Type} recently added`);

      this.emit('gotitems', items);

      return items;

    })

    .then( (items) => {
      // GOT items details
      // scrape via TMDB/TVDB

      // TODO: scrape

      let ps = [];
      let _scraper = 'TMDB';

      if ( this.plexlibrary.Type !== 'movie' ) {
        _scraper = 'TVDB';
      }

      for ( let plexItem of items ) {
        ps.push( new Promise( (resolve, reject) => {
          Scraper[ _scraper ].search(plexItem.title, plexItem.year).then( (tmdbData) => {
              let results = tmdbData.results;
              let first = results[0];
              if ( first ) {
                Scraper[ _scraper ].getInfo(first.id).then( (klass) => {
                  resolve( {scraped: klass, plexItem} );
                }).catch( (e) => {
                  console.error(`[ERROR ${_scraper}-info-${this.plexlibrary.Key}] ${e.message} [${plexItem.title} (${plexItem.year})]`);
                  resolve( {scraped: null, plexItem} );
                })
              } else {
                // TODO: collect data from Plex resultset
                resolve( {scraped: null, plexItem} );
              }
            }).catch( (e) => {
              console.error(`[ERROR ${_scraper}-search-${this.plexlibrary.Key}] ${e.message} [${plexItem.title} (${plexItem.year})]`);
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
          let compiledTemplate = Templates.Movie(obj.scraped, item.plexItem, this.plexlibrary.Name);
          ps.push(  Promise.resolve({poster: obj.scraped.Poster, html: compiledTemplate}) );
        } catch( e ) {
          console.log(`[ERROR pug] ${e.message}`);
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
            console.log(`**** ${this.plexlibrary.Key} `);
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

      console.log(`[ERROR] job finished with error ${error.message}`);
    } else {
      console.log(`job ${this.plexlibrary.Type} is successfully completed`);
    }

    this.emit('completed', error);

  }


}


module.exports = Job;
