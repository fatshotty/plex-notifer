const {Config} = require('./utils');
const GOT = require('got');
const Path = require('path');

const EMBY_URL = `http://${Config.EMBY_IP}:${Config.EMBY_PORT}/emby/Users/${Config.EMBY_USER}/{PATH}?api_key=${Config.EMBY_PASSWORD}&{PARAMS}`;
const EMBY_RAW_URL = `http://${Config.EMBY_IP}:${Config.EMBY_PORT}/emby/{PATH}?api_key=${Config.EMBY_PASSWORD}&{PARAMS}`;

async function EmbyQuery(path, params) {
  return GOT( Path.normalize(EMBY_URL.replace('{PATH}', path).replace('{PARAMS}', params || '') ) ).json();
}

function EmbyURL(path, params) {
  return Path.normalize(EMBY_RAW_URL.replace('{PATH}', path).replace('{PARAMS}', params || '') )
}

async function EmbyRawQuery(path, params) {
  return GOT( EmbyURL(path, params) );
}


class EmbyLibrary {

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

  get Schedule() {
    return this.data.jobschedule;
  }

  constructor(obj) {
    this.data = obj;
  }

  async recentlyAdded(start, count) {
    const fields = [
      'MediaSources',
      'DateCreated',
      'DateCreated',
      'ProviderIds',
      'FileName',
      'People',
      'Studios'
    ].join(',');
    return await EmbyQuery('/Items/Latest', `Fields=${fields}&GroupItems=true&ParentId=${this.Key}&IncludeItemTypes=${this.Type}&StartIndex=${start || ''}&Limit=${count || '50'}`);
  }

  async filterRecentlyAdded(start, count) {
    const res = await this.recentlyAdded(start, 3);

    const sortedRemappedItems = [];
    for await ( const item of res) {
      const it = await this.itemDetails(item.Id)
      sortedRemappedItems.push( it );
    }

    // let sortedRemappedItems = arr.sort( (item1, item2) => {
    //   return item1.DateUpdated > item2.DateUpdated ? 1 : -1;
    // });

    return sortedRemappedItems.filter( (item) => {
      return item.DateUpdated > this.LastScan;
    }).sort( (item1, item2) => {
      return item1.DateUpdated > item2.DateUpdated ? 1 : -1;
    });

      // let MediaContainer = res.MediaContainer;

      // // if ( MediaContainer.librarySectionID != 7 ) return [];

      // let items = MediaContainer.Metadata || [];
      // console.log(`[${this.Name} (${this.Key})] found ${items.length} recently added`);

      // let remappedItems = this.remapData( items );

      // console.log(`[${this.Name} (${this.Key})] remapped in ${remappedItems.length} recently added`);

      // let sortedRemappedItems = remappedItems.sort( (item1, item2) => {
      //   return item1.addedAt > item2.addedAt ? 1 : -1;
      // });

      // return sortedRemappedItems.filter( (item) => {
      //   return item.addedAt > this.LastScan; // && item.key == '/library/metadata/42317';
      // }).sort( (item1, item2) => {
      //   return item1.addedAt > item2.addedAt ? 1 : -1;
      // });

  }


  async itemDetails(id) {
    const it =  await EmbyQuery(`/Items/${id}`);
    if (it.Type === 'Series') {

      let seasons = await EmbyQuery(`/Items`, `Recursive=true&ParentId=${id}&IncludeItemTypes=Season&Fields=MediaStreams,MediaSources,DateCreated`);
      seasons = seasons.Items;
      for (const seas of seasons) {
        let eps = await EmbyQuery(`/Items`, `Recursive=true&ParentId=${seas.Id}&IncludeItemTypes=Episode&Fields=MediaStreams,MediaSources,DateCreated`);

        eps = eps.Items;
        
        seas.Episodes = eps.filter(ep => {
          const d = new Date(ep.DateCreated);
          return parseInt(d.getTime() / 1000, 10) > this.LastScan;
        });
      }

      it.Seasons = seasons.filter(seas => seas.Episodes.length > 0);

      it.DateUpdated = new Date(it.DateCreated).getTime();
      for (const seas of it.Seasons) {
        for (const ep of seas.Episodes){
          it.DateUpdated = Math.max( new Date(it.DateUpdated).getTime(), new Date(ep.DateCreated).getTime())
        }
      }

      it.DateUpdated = parseInt(new Date(it.DateUpdated).getTime() / 1000, 10)
    } else {
      it.DateUpdated = parseInt(new Date(it.DateCreated).getTime() / 1000, 10)
    }
    

    return it;
  }

  remapData( items ) {
    if ( this.Type == 'tvshows' ) {

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


    } else if ( this.Type == 'movies' ) {
    //   // Video - Videos Collection

    //   let res = {};
    //   for ( let item of items ) {

    //     let filepath = null;
    //     try {
    //       filepath = item.Media[0].Part[0].file;
    //     } catch (e) {
    //       continue;
    //     }

    //     // let fileext = Path.extname(filepath);
    //     // let filename = Path.basename(filepath, fileext);
    //     let dirpath = Path.dirname(filepath);
    //     let dirname = Path.basename(dirpath);

    //     let collection = res[ dirname ];
    //     if ( !collection ) {
    //       collection = res[ dirname ] = JSON.parse( JSON.stringify(item) ); // duplicate item
    //       collection.Media = [];
    //     }

    //     collection.title = dirname;
    //     collection.Media = collection.Media.concat( item.Media );

    //     collection.addedAt = Math.max( collection.addedAt, item.addedAt );

    //   }
    //   return Object.values(res);


    // } else {
      // docu-film , film, cineteca, animation

      let res = {};
      for ( let item of items ) {
        let year = item.year || 0;
        let movie = res[ `${item.title.toLowerCase()}-${year}` ];
        if ( !movie ) {
          movie = res[ `${item.title.toLowerCase()}-${year}` ] = JSON.parse(JSON.stringify(item) );
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
  EmbyQuery,
  EmbyRawQuery,
  EmbyLibrary,
  EmbyURL
};
