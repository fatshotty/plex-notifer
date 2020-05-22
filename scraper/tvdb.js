const {Config} = require('../utils');
const TVDB = require('node-tvdb');

let ALL_TVDB_KEY = Config.TVDB_API_KEY.split(',');
let TvdbCli = new TVDB( ALL_TVDB_KEY.shift(), 'it');



function search(terms, year) {
  return TvdbCli.getSeriesByName(terms, 'it').then( (tvshows) => {
    let result = [];

    // check entire name and year
    for ( let tvshow of tvshows ) {
      if ( tvshow.id == '86364') {
        console.log('found');
      }
      if ( tvshow.seriesName && tvshow.firstAired ) {
        let checkYear = true;
        if ( year ) {
          checkYear = tvshow.firstAired.substring(0, 4) == year;
        }
        if ( tvshow.seriesName.trim().toLowerCase() == terms.trim().toLowerCase() && checkYear ) {
          result.push(tvshow);
        }
      }
    }

    if ( result.length == 0 ) {
      console.warn(`\t[TVDB] [${terms} - (${year})] not found by entire name. Check another way`);
      for ( let tvshow of tvshows ) {
        if ( tvshow.seriesName && tvshow.firstAired ) {
          let checkYear = true;
          if ( year ) {
            checkYear = tvshow.firstAired.substring(0, 4) == year;
          }
          if ( tvshow.seriesName.toLowerCase().indexOf( terms.toLowerCase() ) == 0 && checkYear ) {
            result.push(tvshow);
          }
        }
      }
    }

    if ( result.length == 0 ) {
      console.warn(`\t[TVDB] [${terms} - (${year})] not found. Check another way`);

      for ( let tvshow of tvshows ) {
        if ( tvshow.seriesName && tvshow.firstAired ) {
          let checkYear = true;

          if ( year ) {
            let tvshow_year = parseInt( tvshow.firstAired.substring(0, 4), 10 );
            checkYear = tvshow_year >= (year - 2) || tvshow_year <= (year + 2);
          }
          if ( tvshow.seriesName.trim().toLowerCase() == terms.trim().toLowerCase() && checkYear ) {
            console.warn(`\t[TVDB] '${tvshow.seriesName}' found with range of year: ${year} - ${tvshow.firstAired}`);
            result.push(tvshow);
          } else if ( tvshow.seriesName.toLowerCase().indexOf( terms.toLowerCase() ) == 0 && checkYear ) {
            console.warn(`\t[TVDB] '${tvshow.seriesName}' found with part of name and range of year: ${year} - ${tvshow.firstAired}`);
            result.push(tvshow);
          } else {
            let tvshow_name = tvshow.seriesName;
            tvshow_name = tvshow_name.replace(/[^\w|\s]/g, '');
            if ( tvshow_name.toLowerCase().indexOf( terms.toLowerCase() ) == 0 && checkYear ) {
              console.warn(`\t[TVDB] '${tvshow.seriesName}' found without special chars and range of year: ${year} - ${tvshow.firstAired}`);
              result.push(tvshow);
            }
          }
        }
      }

    }

    return {results: result};
  }).catch( (e) => {
    console.error(`[ERROR tvdb-search] ${e.message}`);
    throw e;
  });
}




function getInfo(id, type) {
  return TvdbCli.getSeriesAllById(id).then( (data) => {
    return remapData( data );
  }).catch( (e) => {
    console.error(`[ERROR tvdb-info] ${e.message}`);
    throw e;
  });
}



function remapData(data) {

  let tvshow = {
    backdropPath:   data.fanart,
    firstAirDate:  data.firstAired,
    genres:  data.genre.map( g => ({name: g})),
    id:  data.id,
    name:  data.seriesName,
    posterPath:  data.poster,
    homepage:  null,
    originalName:  null,
    overview:  data.overview,
    voteAverage:  data.rating || data.siteRating,
    imdbId: data.imdbId,
    seasons: []
  };

  let seasons = {};

  for ( let episode of data.episodes ) {
    let seas = seasons[ `s${episode.airedSeason}`];
    if ( !seas ) {
      seas = seasons[ `s${episode.airedSeason}`] = {
        id: episode.airedSeasonID,
        airDate: episode.firstAired,
        name: `Stagione ${episode.airedSeason}`,
        seasonNumber: episode.airedSeason,
        posterPath: episode.filename,
        episodes: []
      };
    }

    seas.episodes.push({
      airDate:  episode.firstAired,
      episodeNumber:  episode.airedEpisodeNumber,
      id:  episode.id,
      name:  episode.episodeName,
      overview:  episode.overview,
      seasonNumber:  episode.airedSeason,
      voteAverage: episode.siteRating,
      backdropPath: episode.filename
    });

  }

  tvshow.seasons = Object.values(seasons);
  return tvshow;

}

module.exports = {
  search: search,
  getInfo: getInfo
};
