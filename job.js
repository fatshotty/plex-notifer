const {PlexLibrary} = require('./plex');
const {Config} = require('./utils');
const CronJob = require('cron').CronJob;
const Templates = require('./templates/index');
const Path = require('path');
const EventEmitter = require('events');

const Scraper = require('./scraper/scraper');

const TelegramBot = require('./telegram-bot');

const SCRAPERS = ['TMDB', 'TVDB'];


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

    if ( this.options._manual ) {
      return;
    }

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

      return items;

    }).then( (items) => {

      return this.executeScrapeAndNotify(items)

    })

    .then( () => {
      this.onComplete(null);
    })

    .catch( (e) => {
      this.onComplete(e);
    });


  }



  executeScrapeAndNotify( _items ) {

    return new Promise( (resolve, reject) => {
      // GOT items details
      // scrape via TMDB/TVDB

      // TODO: scrape

      if ( Config.PLEX_LIBRARY_SKIP_SCRAPE.indexOf( this.plexlibrary.Key) > -1 ) {
        console.log(`${this.JobName} skip scraper`);
        return resolve( _items.map( i => ({plexItem: i}) ) );
      }

      let ps = [];
      let _scraper_type = 'movie';

      if ( this.plexlibrary.Type == 'show' ) {
        _scraper_type = 'tv';
      }

      for ( let plexItem of _items ) {
        ps.push( this.scrape( plexItem, _scraper_type ) );
      }

      ps.length ? Promise.all(ps).then(resolve) : resolve([]) ;
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

      return Promise.all(ps).then( (resp) => {
        this.emit('gotitems', items);
        return resp;
      });
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
  }


  scrape(plexItem, type) {

    let scrapeIndex = -1;

    let {title, year} = this.extractTitleYear(plexItem);

    title = title || plexItem.title;
    year = year || plexItem.year;

    return new Promise( (resolve, reject) => {

      let fn_scrape = () => {
        let scraper = SCRAPERS[ ++scrapeIndex ];
        if ( !scraper ) {
          console.log(`${this.JobName} scraping ${title} (${year}) no more scraper`);
          return resolve( {scraped: null, plexItem} );
        }
        console.log(`${this.JobName} scraping ${title} (${year}) via ${scraper} (addedAt: ${plexItem.addedAt})`);
        return Scraper[ scraper ].search(title, year, type).then( (scraperdata) => {
          let results = scraperdata.results;
          let first = results[0];
          if ( first ) {
            Scraper[ scraper ].getInfo(first.id, type).then( (klass) => {
              resolve( {scraped: klass, plexItem} );
            }).catch( (err) => {
              console.error( `${this.JobName} - ${title} (${year}) - error during 'getInfo' - ${err.message}` );
              return resolve( {scraped: null, plexItem} );
            });
          } else {
            // force to catch error on 'catch' function
            throw new Error(`not found on ${scraper}`);
          }
        }).catch( (e) => {
          console.error( `${this.JobName} - ${title} (${year}) ${e.message}` );
          fn_scrape();
        });
      }

      fn_scrape();
    });

  }


  extractTitleYear(plexItem) {

    let media = plexItem.Media;
    let firstMedia = media && media[0];

    let parts = firstMedia && firstMedia.Part;
    let part = parts && parts[0];
    let file = part && part.file;

    if ( file ) {

      let relativePath = Path.relative(Config.ROOT_MEDIA_FOLDER, file);
      let paths = relativePath.split( Path.sep );

      let category = paths.shift();
      if ( !category ) {
        // maybe path starts with '/'
        category = paths.shift();
      }

      let foldername = paths.shift();

      let year = foldername.match(/\((\d{4})\)$/) ? foldername.match(/\((\d{4})\)$/)[1] : 0;
      let title = foldername.replace(/\((\d{4})\)$/, '');

      year = parseInt(year, 10);
      title = title.trim();

      return {title, year, category};
    }

    return {}

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
