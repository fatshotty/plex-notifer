const Express = require('express')
const CORS = require('cors')
const BodyParser = require('body-parser');
const {Config} = require('../utils');
const Request = require('./models/Request')
const TelegramBot = require('../telegram-bot');
const Templates = require('./templates');

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
  process.nextTick( preprocessRequest.bind(null, formdata) );

  res.status(200).send('OK');
})


App.listen(PORT, IP, () => {
  console.log('WEBHOOK listening on port', PORT);
})




async function preprocessRequest(jsondata) {
  let request = new Request(jsondata);


  let loadedrequest = Request.find({
    MediaTitle: request.MediaTitle
  });

  if ( loadedrequest ) {

    loadedrequest.Type = request.Type;
    loadedrequest.RequestedByUsername = request.RequestedByUsername;

    request = loadedrequest;

  }

  request.save();

  processRequest( request );
}


async function processRequest(request) {

  let tmpl = Templates[ request.Type ];


  if ( tmpl ) {


    if ( tmpl.admin ) {
      // if ( [ Request.TYPES.MEDIA_PENDING, Request.TYPES.MEDIA_DECLINED ].indexOf( request.Type ) > -1 ) {

        let tmpldata = await tmpl.admin( request.toJSON() );

        if ( TelegramBot.BotAdminEnabled ) {
          TelegramBot.sendNotificationToMonitor( tmpldata.poster, tmpldata.html, `${request.Type} - ${request.MediaTitle}` )
        } else {
          console.log( tmpldata.html );
        }

      }
    // }

    if ( tmpl.users ) {

      // if ( [ Request.TYPES.MEDIA_DECLINED, Request.TYPES.MEDIA_APPROVED, Request.TYPES.MEDIA_AVAILABLE ].indexOf( request.Type ) > -1 ) {

        let tmpldata = await tmpl.users( request.toJSON() );

        if ( TelegramBot.Enabled ) {

          await TelegramBot.publish( tmpldata.poster, tmpldata.html )

        } else {

          console.log( tmpldata.html );

        }

      // }
    }





  } else {

    // TODO: no template found
  }


}



module.exports = {preprocessRequest, processRequest};


