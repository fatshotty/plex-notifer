const {Trakt} = require('../utils');


module.exports.admin = async function( request ) {

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
  if ( request.ImdbId ) {
    const str = [];
    str.push(`<a href="https://www.imdb.com/title/${request.ImdbId}">IMDB</a> ↗️`);

    try {
      let traktData = await Trakt[ isMovie ? 'getMovieByID' : 'getTvShowByID' ]( request.ImdbId );
      str.push(`<a href="https://trakt.tv/${isMovie ? 'movies' : 'shows'}/${traktData.ids.slug}">TRAKT</a> ↗️ `);

    } catch(e) {
      console.log(`Cannot get trakt info by ${request.ImdbId}`, e);
    }

    html += str.join('\n');
  }
  if ( request.TvdbId ) {
    html += `<a href="https://www.thetvdb.com/dereferrer/series/${request.TvdbId}">TVDB</a> ↗️`
  }



  return {poster: null, html}

}
