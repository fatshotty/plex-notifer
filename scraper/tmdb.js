const {Config} = require('../utils');
const TMDB = require('tmdb').Tmdb;

let ALL_TMDB_KEY = Config.TMDB_API_KEY.split(',');

let TmdbCli = new TMDB( ALL_TMDB_KEY.shift(), 'it');

let TmdbImagesConfig = null;
let TmdbConfig = null;

let PROMISE = Promise.all([TmdbCli.get('configuration'), TmdbCli.get('configuration/languages')]).then( (rsp) => {
  let config = rsp[0];
  let langs = rsp[1];
  TmdbConfig = config;
  TmdbConfig.Languages = langs.filter( l => l.name && l.englishName && l.englishName != 'No Language' ).map( l => l.iso6391 );
  TmdbImagesConfig = config.images;
}).catch( (err) => {
  console.error(err);
});




function search(terms, year, type='movie') {
  let data = {query: terms, language: TmdbCli.language};
  if ( year ) {
    data.year = year;
  }
  return TmdbCli.get(`search/${type || 'multi'}`, data).then( (obj) => {
    let termsClean = terms.replace(/[^\w|\s]/g, '');

    let results = obj.results.filter((movie) => {
      let checkYear = true;
      if ( year ) {
        checkYear = (movie.releaseDate || movie.firstAirDate || '').substring(0, 4) == year;
      }
      return ( (movie.title || movie.originalName || '').toLowerCase() == terms.toLowerCase()) && checkYear;
    });

    if ( results.length == 0 ) {
      results = obj.results.filter( (movie) => {
        let movie_name = (movie.title || movie.originalName).replace(/[^\w|\s]/g, '');
        let checkYear = true;
        if ( year ) {
          checkYear = (movie.releaseDate || movie.firstAirDate || '').substring(0, 4) == year;
        }
        return ( (movie_name|| '').toLowerCase() == termsClean.toLowerCase()) && checkYear;
      });
    }

    return {results};
  }).catch( (e) => {
    console.error(`[ERROR tmdb-search] ${e.message}`);
    throw e;
  });
}



function getInfo(id, type='movie') {
  return TmdbCli.get(`${type}/${id}`, {append_to_response: 'videos,images,credits', include_image_language: 'it', language: TmdbCli.language}).catch( (e) => {
    console.error(`[ERROR tmdb-info] ${e.message}`);
    throw e;
  });
}


function wrap(fn) {
  return function() {
    let args = Array.prototype.slice.call(arguments);
    return PROMISE.then( () => {
      return fn.apply(null, args);
    })
  }
}


module.exports = {
  search: wrap(search),
  getInfo: wrap(getInfo),
  getTmdbConfig() {
    return TmdbConfig;
  }
};
