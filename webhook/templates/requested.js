


module.exports.admin = function( request ) {


  let icon = request.MediaType == 'movie' ? '🎬' : '📺';
  let type = request.MediaType == 'movie' ? 'Film' : 'Serie TV';

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
    html += `<a href="https://www.imdb.com/title/${request.ImdbId}">IMDB</a> ↗️
`
  }
  if ( request.TvdbId ) {
    html += `<a href="https://www.thetvdb.com/dereferrer/series/${request.TvdbId}">TVDB</a> ↗️`
  }



  return {poster: null, html}

}
