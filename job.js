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

  library = null;

  get JobName() {
    return `[${this.library.Name} (${this.library.Key})]`;
  }

  constructor(library) {
    super();
    this.library = library;
    this.init();
  }


  init() {

    // if ( this.options._manual ) {
    //   return;
    // }

    this._job = new CronJob(
      this.library.Schedule,    // schedule
      this.execute.bind(this),     // onTick
      null,                        // onComplete
      false,                       // start
      'Europe/Amsterdam'           // timeZone
    );
  }


  start() {
    this._job.start();

    if ( Config.IMMEDIATE ) {
      console.log(`[WARN] job ${this.library.Name} - ${this.library.Key} will start now!`);
      this.execute();
    }
  }


  async execute() {

    if ( this.isExecuting ) {
      console.log(`${this.JobName} is already running, skipping`);
      return;
    }

    this.isExecuting = true;

    console.log(`${this.JobName} job is starting...`);

    try {

      const items = await this.library.filterRecentlyAdded()

      console.log(`${this.JobName} ${items.length} recently added`);

      await this.executeScrapeAndNotify(items)

      this.onComplete(null);
    } catch (e) {
      
      this.onComplete(e);
    }


  }


  async executeScrapeAndNotify( _items ) {

    // GOT items details
    // scrape via TMDB/TVDB

    // TODO: scrape

    // if ( Config.PLEX_LIBRARY_SKIP_SCRAPE.indexOf( this.library.Key) > -1 ) {
    //   console.log(`${this.JobName} skip scraper`);
    //   return resolve( _items.map( i => ({plexItem: i}) ) );
    // }

    // let ps = [];
    // let _scraper_type = 'movie';

    // if ( this.library.Type == 'show' ) {
    //   _scraper_type = 'tv';
    // }

    // for ( let Item of _items ) {
    //   ps.push( this.scrape( Item, _scraper_type ) );
    // }

    // let items = [];
    // if (ps.length) {
    //   items = await Promise.all(ps);
    // }

    // GOT data scraped
    // Compile template
    let ps = [];

    for ( let item of _items ) {
      // let obj = {
      //   libItem: item.libItem || {},
      //   scraped: item.scraped || {}
      // };
      try {
        console.log(`${this.JobName} try to notify - '${item.Name}'`);
        let compiledTemplate = Templates[`template_${this.library.Type}`](item, this.library);
        ps.push(  compiledTemplate ); // Promise.resolve({poster: obj.scraped.Poster, html: compiledTemplate}) );
      } catch( e ) {
        console.log(`[ERROR pug] ${this.JobName} ${e.message}`, e);
        if ( TelegramBot.Enabled ) {
          TelegramBot.sendError( `Pug ${this.JobName} - ${obj.scraped.Name || item.libItem.title}`, e.stack);
        }
      }

    }

    const templates = await Promise.all(ps);
    this.emit('gotitems', _items);


    ps = [];
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


    await Promise.all( ps );
  }


  scrape(libItem, type) {

    let scrapeIndex = -1;

    // let {title, year} = this.extractTitleYear(libItem);
    let {Name: title, ProductionYear: year } = libItem;
    const category = this.library.Name;

    // title = title || libItem.title;
    // year = year || libItem.year;

    return new Promise( (resolve, reject) => {

      let fn_scrape = () => {
        let scraper = SCRAPERS[ ++scrapeIndex ];
        if ( !scraper ) {
          console.log(`${this.JobName} scraping ${title} (${year}) no more scraper`);
          return resolve( {scraped: null, libItem} );
        }
        console.log(`${this.JobName} scraping ${title} (${year}) via ${scraper} (addedAt: ${libItem.DateCreated})`);
        return Scraper[ scraper ].search(title, year, type).then( (scraperdata) => {
          let results = scraperdata.results;
          let first = results[0];
          if ( first ) {
            Scraper[ scraper ].getInfo(first.id, type).then( (klass) => {
              resolve( {scraped: klass, libItem} );
            }).catch( (err) => {
              console.error( `${this.JobName} - ${title} (${year}) - error during 'getInfo' - ${err.message}` );
              return resolve( {scraped: null, libItem} );
            });
          } else {
            // force to catch error on 'catch' function
            throw new Error(`not found on ${scraper}`);
          }
        }).catch( (e) => {
          console.error( `${this.JobName} - ${title} (${year}) ${e.message}` );
          if ( type === 'movie' ) {
            // in case of movie: stop looping scraper
            return resolve( {scraped: null, libItem} );
          } else {
            // in case of tv-shows
            fn_scrape();
          }
        });
      }

      fn_scrape();
    });

  }


  extractTitleYear(libItem) {

    let media = libItem.Media;
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
