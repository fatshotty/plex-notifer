const {Config, Log} = require('../utils');
const IMDB = require('imdb-api');

const TMDB = require('./tmdb');
const TVDB = require('./tvdb');

const Movie = require('./models/movie');
const TvShow = require('./models/tvshow');


let ALL_IMDB_KEY = Config.IMDB_API_KEY.split(',');
let ImdbCli = new IMDB.Client({apiKey: ALL_IMDB_KEY.shift()});



function getInfo(id, type = 'movie') {

  return _getInfo(id, type).then( (data) => {
    let imdbid = data.imdbId;

    let p = Promise.resolve( data );

    if ( imdbid ) {
      p = new Promise( (resolve, reject) => {
        function redoSearchImdb() {
          return ImdbCli.get({'id': imdbid}, {headers: { 'Accept-Language': 'it'}}).then( (imdb_data) => {
            data.imdb_data = imdb_data;
            return resolve(data);
          }).catch( (e) => {
            if ( e.statusCode == 401 && ALL_IMDB_KEY.length ) {
              ImdbCli = new IMDB.Client({apiKey: ALL_IMDB_KEY.shift()});
              redoSearchImdb().then( resolve ).catch(reject);
            } else {
              reject(e);
            }
          });
        }
        redoSearchImdb();
      })

    }

    return p.then(  (data) => {
      if ( type == 'movie' ) {
        return new Movie(data, TmdbConfig);
      } else if ( type == 'tv' ) {
        // Log.info(`get seasons infos for ${id}`);
        // data.seasons = await getInfoSeasons( id, data.seasons.map( s => s.seasonNumber ) );
        return new TvShow(data, TmdbConfig);
      } else {
        throw new Error('no supported media');
      }
    });

  });

}



function wrapInfo(engine) {
  return function(id, type='movie') {
    let args = Array.prototype.slice.call(arguments, 0);
    return engine.getInfo.apply(engine, args).then( (data) => {
      let imdbid = data.imdbId;

      let p = Promise.resolve( data );

      if ( imdbid ) {
        p = new Promise( (resolve, reject) => {
          function redoSearchImdb() {
            return ImdbCli.get({'id': imdbid}, {headers: { 'Accept-Language': 'it'}}).then( (imdb_data) => {
              data.imdb_data = imdb_data;
              return resolve(data);
            }).catch( (e) => {
              if ( e.statusCode == 401 && ALL_IMDB_KEY.length ) {
                ImdbCli = new IMDB.Client({apiKey: ALL_IMDB_KEY.shift()});
                redoSearchImdb().then( resolve ).catch(reject);
              } else {
                reject(e);
              }
            });
          }
          redoSearchImdb();
        });
      }

      return p;
    }).then( (data) => {
      if ( type == 'movie' ) {
        return new Movie(data, TMDB.getTmdbConfig() );
      } else if ( type == 'tv' ) {
        // Log.info(`get seasons infos for ${id}`);
        // data.seasons = await getInfoSeasons( id, data.seasons.map( s => s.seasonNumber ) );
        return new TvShow(data, engine === TMDB ? TMDB.getTmdbConfig() : null );
      } else {
        throw new Error('no supported media');
      }
    });
  }
}



module.exports = {
  TMDB: {
    search: TMDB.search,
    getInfo: wrapInfo(TMDB)
  },
  TVDB: {
    search: TVDB.search,
    getInfo: wrapInfo(TVDB)
  }
};
