const {Config} = require('./utils');
const Path = require('path');
const Movie = require('./scraper/models/movie')
const TvShow = require('./scraper/models/tvshow')

const Worker /* {parentPort, workerData, MessageChannel} */  = require('worker_threads');


// Worker.parentPort.on('message', startProcess);


function startProcess({JOB, items}) {
  JOB = 'Thread - ' + JOB.substring(1);
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
      Url: Path.join( Path.sep, Path.relative(Config.RootMediaFolder, part.file) ),
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

      if ( item.scraped instanceof Movie ) {
        // loop mediafiles
        entry.Mediafiles = item.plexItem.Media.map( (mf, i) => this.computeMovieData(mf, i) ).filter( m => !!m );
      } else if ( item.scraped instanceof TvShow ) {
        // loop seasons

        // entry.Seasons = loopSeasons(m.Seasons, file.subfolders, entry.Year );

      }

      console.log( JSON.stringify(entry) );

    }


  }


  saveToDB() {

  }



}



module.exports = startProcess;
