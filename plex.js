const {Config} = require('./utils');
const PlexAPI = require("plex-api");
const Path = require('path');


const options = {
  hostname: Config.PLEX_IP,
  port: Config.PLEX_PORT,
  username: Config.PLEX_USER,
  password: Config.PLEX_PASSWORD,
  options: {
    identifier: Config.PLEX_IDENTIFIER
  }
}

const Plex = new PlexAPI( options );


function PlexQuery() {
  let args = Array.prototype.slice.call(arguments, 0);
  return Plex.query.apply(Plex, args);
}



class PlexLibrary {

  get Name() {
    return this.data.title;
  }

  get Key() {
    return this.data.key;
  }

  get LastScan() {
    return this.data.lastScan;
  }

  get Type() {
    return this.data.type
  }

  constructor(obj) {
    this.data = obj;
  }

  recentlyAdded(start, count) {
    // ?X-Plex-Container-Start=${start}&X-Plex-Container-Size=${count}
    return PlexQuery(`/library/sections/${this.Key}/recentlyAdded`);
  }

  filterRecentlyAdded(start, count) {
    return this.recentlyAdded(start, count).then( (res) => {
      let MediaContainer = res.MediaContainer;

      // if ( MediaContainer.librarySectionID != 7 ) return [];

      let items = MediaContainer.Metadata || [];

      items = this.remapData( items );

      return items.filter( (item) => {

        return item.addedAt > this.LastScan; // && item.key == '/library/metadata/42317';

      }).sort( (item1, item2) => {
        return item1.addedAt > item2.addedAt ? 1 : -1;
      });

    });
  }


  itemDetails(item) {
    return PlexQuery(`${item.key}`);
  }

  remapData( items ) {
    if ( this.Key == '9'|| this.Key == '13' ) {

      // SerieTV

      let res = {};
      for ( let item of items ) {

        let show = res[ item.grandparentTitle ];
        if ( !show ) {
          show = res[ item.grandparentTitle ] = JSON.parse( JSON.stringify(item) ); // duplicate item
          show.Seasons = {};
          show.Media = [];
        }

        show.Seasons[ item.parentTitle ] = item.year
        show.Media = show.Media.concat( item.Media );

        show.addedAt = Math.max( show.addedAt, item.addedAt );
      }

      let shows = Object.values(res);

      for ( let show of shows ) {
        show.title = show.grandparentTitle;
        show.year = Object.values(show.Seasons).sort( (y1, y2) => y1 > y2 ? 1 : -1 )[0];
      }

      return shows;


    } else if ( this.Key == '16' || this.Key == '25' ) {
      // Video - Videos Collection

      let res = {};
      for ( let item of items ) {

        let filepath = null;
        try {
          filepath = item.Media[0].Part[0].file;
        } catch (e) {
          continue;
        }

        let fileext = Path.extname(filepath);
        let filename = Path.basename(filepath, fileext);
        let dirpath = Path.dirname(filepath);
        let dirname = Path.basename(dirpath);

        let collection = res[ dirname ];
        if ( !collection ) {
          collection = res[ dirname ] = JSON.parse( JSON.stringify(item) ); // duplicate item
          collection.Media = [];
        }

        collection.title = dirname;
        collection.Media = collection.Media.concat( item.Media );

        collection.addedAt = Math.max( collection.addedAt, item.addedAt );

      }
      return Object.values(res);


    } else {
      // docu-film , film

      let res = {};
      for ( let item of items ) {

        let movie = res[ item.title.toLowerCase() ];
        if ( !movie ) {
          movie = res[ item.title.toLowerCase() ] = JSON.parse(JSON.stringify(item) );
          movie.Media = [];
        }

        movie.Media = movie.Media.concat( item.Media );

      }

      return Object.values(res);
    }
  }


  start() {
    /**
    V configure cron job
    V get all recentlyAdded
    V filter by lastScan
    V loop each recent movies
    V scrape all data
    V check telgram bot
    V compiute html noty
    V publish to telegram
     */
  }

}


module.exports = {
  PlexQuery,
  PlexLibrary
};
