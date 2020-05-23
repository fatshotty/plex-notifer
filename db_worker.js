const {Config} = require('./utils');
const Path = require('path');
const Movie = require('./scraper/models/movie')
const TvShow = require('./scraper/models/tvshow')

const Worker /* {parentPort, workerData, MessageChannel} */  = require('worker_threads');


Worker.parentPort.on('message', startProcess);


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



  computeEntryData(scrapedItem, plexItem) {

    let data = {
      Name: scrapedItem.Title || plexItem.title,
      TmdbId: `${scrapedItem.Id || 'id-' + Date.now()}`,
      ImdbId: scrapedItem.ImdbData ? scrapedItem.ImdbData.imdbid : undefined,
      Genres: scrapedItem.Genres,
      Year: parseInt( `${scrapedItem.DateRange}`.substring(0, 4) , 10),
      Website: scrapedItem.Homepage,
      Collection: scrapedItem.Collection,
      RatingImdb: parseFloat( scrapedItem.ImdbData ? scrapedItem.ImdbData.rating : 0),
      Director: scrapedItem.Directors[0],
      Cast: scrapedItem.Cast.slice(0, 5),
      Plot: plexItem.summary || scrapedItem.Description,
      YtTrailerId: scrapedItem.YT_trailer || '',
      Poster: scrapedItem.Poster,
      Fanart: scrapedItem.Backdrop,
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
      Reorder: parseInt(index, 10) ? parseInt(index, 10) : undefined,
      Status: 'published'
    };

    return data;
  }


  execute() {

    for ( let item of this._items ) {
      let entry = this.computeEntryData(item.scraped || {}, item.plexItem || {});

      if ( m instanceof Movie ) {
        // loop mediafiles
        entry.Mediafiles = item.plexItem.Media.map( (mf, i) => computeMovieData(mf, i) ).filter( m => !!m );
      } else if ( m instanceof TvShow ) {
        // loop seasons

        entry.Seasons = loopSeasons(m.Seasons, file.subfolders, entry.Year );

      }

      console.log( JSON.stringify(entry) );

    }


  }



}
