const Express = require('express')
const CORS = require('cors')
const BodyParser = require('body-parser');
const {Config} = require('./utils');

console.log('Enabling WEBHOOK');

const BIND_ADDRESS = Config.BIND_WEBHOOK;

const IP = BIND_ADDRESS.split(':')[0]
const PORT = parseInt(BIND_ADDRESS.split(':')[1], 10)


const App = Express();


App.use(CORS())
App.use( BodyParser.json() );


// {
//       "notification_type": "{{notification_type}}",
//       "subject": "{{subject}}",
//       "message": "{{message}}",
//       "image": "{{image}}",
//       "email": "{{notifyuser_email}}",
//       "username": "{{notifyuser_username}}",
//       "avatar": "{{notifyuser_avatar}}",
//       "{{media}}": {
//           "media_type": "{{media_type}}",
//           "tmdbId": "{{media_tmdbid}}",
//           "imdbId": "{{media_imdbid}}",
//           "tvdbId": "{{media_tvdbid}}",
//           "status": "{{media_status}}",
//           "status4k": "{{media_status4k}}"
//       },
//       "{{extra}}": [],
//       "{{request}}": {
//           "request_id": "{{request_id}}",
//           "requestedBy_email": "{{requestedBy_email}}",
//           "requestedBy_username": "{{requestedBy_username}}",
//           "requestedBy_avatar": "{{requestedBy_avatar}}"
//       }
//   }




App.post('/webhook/requests', (req, res, next) => {

  let formdata = request.body;

  console.log('WH: ', formdata);

  res.send(200, 'OK')
})



App.listen(PORT, IP, () => {
  console.log('WEBHOOK listening on port', PORT);
})
