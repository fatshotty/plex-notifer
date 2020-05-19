const {Config} = require('./utils');3
const PlexAPI = require("plex-api");


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
    if ( this.Type != 'show' ) {
      return items;
    }


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
