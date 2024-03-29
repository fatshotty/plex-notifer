const {Trakt} = require('../../utils');


module.exports.admin = async function( request, mdblistData ) {

  const isMovie = request.MediaType == 'movie';
  let icon = isMovie ? '🎬' : '📺';
  let type = isMovie ? 'Film' : 'Serie TV';

  let html = `🙋‍♂️ <b>Nuova richiesta</b>

<i>${icon} ${request.MediaTitle}</i>

<b>Tipo:</b> <i>${type}</i>
<b>Richiesto da:</b> <i>${request.RequestedByUsername}</i>

`

  if ( request.TmdbId ) {
    html += `<a href="https://www.themoviedb.org/${request.MediaType}/${request.TmdbId}">TMDB</a> ↗️
`
  }

  if ( request.TvdbId ) {
    html += `<a href="https://www.thetvdb.com/dereferrer/series/${request.TvdbId}">TVDB</a> ↗️
`
  }


  if ( mdblistData ) {
    const str = [];
    str.push(`<a href="https://www.imdb.com/title/${mdblistData.imdbid}">IMDB</a> ↗️
`);

    try {
      let traktData = await Trakt[ isMovie ? 'getMovieByID' : 'getTvShowByID' ]( mdblistData.imdbid );
      str.push(`<a href="https://trakt.tv/${isMovie ? 'movies' : 'shows'}/${traktData.ids.slug}">TRAKT</a> ↗️
`);

    } catch(e) {
      console.log(`WH: [${request.RequestID}]`, `Cannot get trakt info by ${mdblistData.imdbid}`, e);
    }


    // show streams
    const streams = [...(new Set([...mdblistData.streams.map(s => s.name), ...mdblistData.watch_providers.map(s => s.name) ]))];
    str.push(`
📡 ${streams.join(' - ')}
`);

    html += str.join('');
  }

  return {poster: null, html}

}
