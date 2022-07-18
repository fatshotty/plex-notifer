


module.exports.admin = function( request ) {


  let icon = request.MediaType == 'movie' ? '🎬' : '📺';
  let type = request.MediaType == 'movie' ? 'Film' : 'Serie TV';

  let html = `🥳 <b>Richiesta Approvata</b>

<i>${icon} ${request.MediaTitle}</i>

Richiesto da: <i>${request.RequestedByUsername}</i>

È stata <b>approvata</b>
`

  return {poster: null, html}

}


module.exports.users = function( request ) {

  let icon = request.MediaType == 'movie' ? '🎬' : '📺';
  let type = request.MediaType == 'movie' ? 'Film' : 'Serie TV';

  let html = `🥳 <b>Richiesta Approvata</b>

La tua richiesta
<i>${icon} ${request.MediaTitle}</i>

È stata <b>approvata</b> e verrà elaborata al più presto

🌺
`

  return {poster: null, html}

}
