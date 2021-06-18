


module.exports.admin = function( request ) {


  let icon = request.MediaType == 'movie' ? '🎬' : '📺';
  let type = request.MediaType == 'movie' ? 'Film' : 'Serie TV';

  let html = `🚫 <b>Richiesta negata</b>

<i>${icon} ${request.MediaTitle}</i>

<b>Tipo:</b> <i>${type}</i>
<b>Richiesto da:</b> <i>${request.RequestedByUsername}</i>

È stata <b>rifiutata</b>
`

  return {poster: null, html}

}


module.exports.users = function(request) {

  let icon = request.MediaType == 'movie' ? '🎬' : '📺';
  let type = request.MediaType == 'movie' ? 'Film' : 'Serie TV';


  let html = `Ci dispiace molto, ma purtroppo la tua richiesta in merito a ${request.MediaTile} non può essere accettata

🌹
`

  return {poster: null, html}

}
