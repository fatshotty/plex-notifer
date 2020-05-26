const {Config} = require('./utils');
const Path = require('path');
const Movie = require('./scraper/models/movie');
const TvShow = require('./scraper/models/tvshow');
const API = require('./api');
const TelegramBot = require('./telegram-bot');

const Worker /* {parentPort, workerData, MessageChannel} */  = require('worker_threads');


// Worker.parentPort.on('message', startProcess);


function startProcess({JOB, items}) {
  JOB = '[Thread - ' + JOB.substring(1);
  this.populateDB = new PopulateDB( JOB, items );

  process.nextTick( this.populateDB.execute.bind(this.populateDB) );

}


class PopulateDB {

  get JobName() {
    return this._jobName;
  }

  constructor(jobname, items) {
    this._jobName = jobname;
    this._items = items;
    console.log(`${this.JobName} - ready to populate db for ${items.length} resources`);
  }



  computeEntryData(scraped, plexItem) {


    let year = scraped.Year || plexItem.year;

    let genres = '';
    if ( scraped.Genres && scraped.Genres.length ) {
      genres = scraped.Genres.slice(0, 3);
    } else if ( plexItem.Genre && plexItem.Genre.length ) {
      genres = plexItem.Genre.slice(0, 3).map( g => g.tag );
    }

    let director = '';
    if ( scraped.Directors && scraped.Directors.length ) {
      director = scraped.Directors[0];
    } else if ( plexItem.Director && plexItem.Director.length ) {
      director = plexItem.Director.slice(0, 2).map( d => d.tag )[0];
    }

    let cast = '';
    if ( scraped.Cast && scraped.Cast.length ) {
      cast = scraped.Cast.slice(0, 5);
    } else if ( plexItem.Role && plexItem.Role.length ) {
      cast = plexItem.Role.slice(0, 5).map( c => c.tag );
    }

    let summary = '';
    if (plexItem.summary ) {
      summary = plexItem.summary;
    } else if ( scraped.Description ) {
      summary = scraped.Description;
    }

    if ( Config.PLOT_LIMIT && summary.length > Config.PLOT_LIMIT ) {
      summary = `${summary.slice(0, Config.PLOT_LIMIT)}...`;
    }

    let data = {
      Name: scraped.Title || plexItem.title,
      TmdbId: `${scraped.Id || 'id-' + Date.now()}`,
      ImdbId: scraped.ImdbData ? scraped.ImdbData.imdbid : undefined,
      Genres: genres,
      Year: year,
      Website: scraped.Homepage,
      Collection: scraped.Collection,
      RatingImdb:  parseFloat( plexItem.rating || (scraped.ImdbData && scraped.ImdbData.rating) || scraped.Vote, 10),
      Director: director,
      Cast: cast,
      Plot: summary,
      YtTrailerId: scraped.YT_trailer || '',
      Poster: scraped.Poster,
      Fanart: scraped.Backdrop,
      is4k: 0,
      ClickCount: 0
    };

    return data;

  }

  computeMovieData(mediafile, index) {

    if ( ! (mediafile && mediafile.Part && mediafile.Part[0]) ) {
      console.log( `[WARN] ${this.JobName} - ${JSON.stringify(mediafile)} has no Part[0]`);
      return null;
    }

    let part = mediafile.Part[0];
    let filename = Path.basename(part.file);

    let videoResolution = mediafile.videoResolution || '';
    if ( videoResolution.toLowerCase() == '4k' ) {
      videoResolution = '2160';
    }
    if ( !videoResolution.toLowerCase().endsWith('p') ) {
      videoResolution += 'p';
    }


    let data = {
      Url: Path.join( Path.sep, Path.relative(Config.ROOT_MEDIA_FOLDER, part.file) ),
      Filename: filename,
      Hidden: false,
      Source: undefined,
      Size: part.size,
      AudioCodec: mediafile.audioCodec,
      Language: 'IT',
      AudioChannels: mediafile.audioChannels,
      VideoCodec: mediafile.videoCodec,
      VideoResolution: videoResolution,
      Reorder: !isNaN( parseInt(index, 10) ) ? parseInt(index, 10) : undefined,
      Status: 'published'
    };

    return data;
  }


  execute() {

    for ( let item of this._items ) {
      let entry = this.computeEntryData(item.scraped || {}, item.plexItem || {});

      let TYPE = 'movies'

      if ( item.plexItem && item.plexItem.Seasons && item.plexItem.Seasons.length > 0 ) {
        // TODO: tvshow
        TYPE = 'tvshows';
      } else {
        // movies
        entry.Mediafiles = item.plexItem.Media.map( (mf, i) => this.computeMovieData(mf, i) ).filter( m => !!m );

      }

      // console.log( JSON.stringify(entry) );


      this.process(entry, TYPE).catch( (e) => {
        TelegramBot.report( `${this.JobName} - error saving on db: ${e.message} - ${( (e.stack && e.stack.split('\n')) || []).shift()}`);
      });

    }

  }


  process(entry, type) {
    let tmdb = undefined;

    if ( entry.TmdbId && !entry.TmdbId.startsWith('id-') ) {
      tmdb = entry.TmdbId;
    }

    console.log(`${this.JobName} processing "${entry.Name} (${entry.Year}) [${type}]"`);

    return API.searchEntity(type, entry.Name, entry.Year, tmdb).then( (data) => {
      data = JSON.parse(data);
      data = data[0];

      if ( data ) {
        // entity already exists
        // TODO: check seasons, episodes, mediafiles
        console.log(`${this.JobName} "${entry.Name} (${entry.Year}) [${type}]" already exists: ${data.ID}`);

        return this.manageExistingEntry(entry, data, type); // .then( resolve ).catch( reject );

      } else {
        // entity not exists

        return API.createEntity(
          type,
          `${entry.TmdbId} - ${entry.Name}`, JSON.stringify(entry)
        )
          .then( (entry_Str) => {

            let savedEntry = JSON.parse(entry_Str);

            console.log(`${this.JobName} saved to db:  ${entry.Name} -> ${savedEntry.ID}`);

          })
      }
    })
    .catch( (e) => {
      console.log(`${this.JobName} ERROR saving to DB ${e.message} - ${( (e.stack && e.stack.split('\n')) || []).shift()}`);
      throw e;
    });

  }


  manageExistingEntry(movie, entry, type) {

    return new Promise( (resolve, reject) => {

      let ps = [];

      if ( movie.Seasons && movie.Seasons.length > 0 ) {
        // maybe a tvshows
        console.log(`${this.JobName} [${entry.ID}] looping seasons`);

        for ( let movieSeason of movie.Seasons ) {
          let found = false;
          for ( let entrySeason of entry.Seasons ) {

            if ( movieSeason.Name ==  entrySeason.Name ) {
              // season has been already created: updating
              found = true;

              // edit season creting episodes

              ps.push( this.manageExistingSeason(entry, movieSeason, entrySeason, type) );
              break;
            }

          }

          if ( !found ) {
            // season must be created on DB
            ps.push( API.createSeason(type, entry.ID, `${movie.TmdbId} - ${movie.Name} - S${movieSeason.Reorder}`, JSON.stringify(movieSeason) ).then( (seas) => {
              console.log(`${this.JobName} [${entry.ID}] season has been created: ${seas.ID} - ${seas.Name} (${seas.Year})`);
            }) );
          }

        }

      }

      if ( movie.Mediafiles ) {
        console.log(`${this.JobName} [${entry.ID}] looping mediafiles`);
        for ( let movieMediafile of movie.Mediafiles ) {
          let found = false;

          for ( let entryMediafile of entry.Mediafiles ) {

            if ( entryMediafile.Filename == movieMediafile.Filename ) {
              found = true;
              break;
            }

          }

          if ( !found ) {
            ps.push( this.createMediaFiles([movieMediafile], entry, null, null, type ) );
          }

        }
      }

      Promise.all(ps).then(resolve, reject);
    });

  }



  manageExistingSeason(entry, movieSeason, entrySeason, type) {
    return new Promise( (resolve, reject ) => {

      let ps = [];

      for ( let movieEpisode of movieSeason.Episodes ) {

        let found = false;
        for ( let entryEpisode of entrySeason.Episodes ) {

          if ( movieEpisode.Reorder == entryEpisode.Reorder ) {
            found = true;
            ps.push( this.manageExistingEpisode( entry, entrySeason, movieEpisode, entryEpisode, type ) );
            break;
          }


        }

        if ( !found ) {
          ps.push( API.createEpisode(type, entry.ID, entrySeason.ID, `${entry.TmdbId} - ${entry.Name} - S${entrySeason.Reorder}E${movieEpisode.Reorder}`, JSON.stringify(movieEpisode) ).then( (epdata) => {
            epdata = JSON.parse(epdata);
            console.log(`${this.JobName} [${entry.ID}] episode created: S${entrySeason.Reorder}E${movieEpisode.Reorder}`);
          }) );
        }


      }

      Promise.all(ps).then( resolve ).catch( reject );
    });
  }


  manageExistingEpisode(entry, entrySeason, movieEpisode, entryEpisode, type) {

    return new Promise( (resolve, reject) => {
      let ps = [];

      for ( let movieMediafile of movieEpisode.Mediafiles ) {
        let found = false;

        for ( let entryMediafile of entryEpisode.Mediafiles ) {

          if ( entryMediafile.Filename == movieMediafile.Filename ) {
            found = true;
            break;
          }

        }

        if ( !found ) {
          ps.push( this.createMediaFiles([movieMediafile], entry, entrySeason, entryEpisode, type ) );
        }

      }

      Promise.all(ps).then( resolve ).catch( reject );
    });


  }


  createMediaFiles(mfs, entry, season, episode, type) {

    let season_id = season ? season.ID : null;
    let episode_id = episode ? episode.ID : null;

    function saveMf() {
      let mf = mfs.shift();
      if ( mf ) {

        // let postData = computeMovieData( mf, entry, season );

        return API.createMediaFile( type, entry.ID, season_id, episode_id, mf.Filename, JSON.stringify(mf) )
          .then( saveMf );

       }  else {

        return Promise.resolve();

      }
    }

    return saveMf();

  }



}



module.exports = startProcess;
