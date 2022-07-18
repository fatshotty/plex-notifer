


module.exports.admin = function( request ) {


  let icon = request.MediaType == 'movie' ? '🎬' : '📺';
  let type = request.MediaType == 'movie' ? 'Film' : 'Serie TV';

  let html = `👍 <b>Contenuto Disponibile</b>

<i>${icon} ${request.MediaTitle}</i>

<b>Tipo:</b> <i>${type}</i>
`

  return {poster: null, html}
};


module.exports.users = function( request ) {

  let icon = request.MediaType == 'movie' ? '🎬' : '📺';
  let type = request.MediaType == 'movie' ? 'Il Film' : 'La Serie TV';

  let html = `🏅 <b>Contenuto disponibile</b>

La richiesta è stata elaborata con successo:
<i>${icon} ${request.MediaTitle}</i>
è ora disponibile nel catalogo

Buona visione
🌺
`

  return {poster: null, html}

}
