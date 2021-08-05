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

  let formdata = req.body;

  let req_id = formdata.request ? formdata.request.request_id : 'no_req_id';

  console.log('WH: new request ->', req_id, JSON.stringify(formdata));
  process.nextTick( preprocessRequest.bind(null, req_id, formdata) );

  res.status(200).send('OK');
})


App.listen(PORT, IP, () => {
  console.log('WH: WEBHOOK listening on port', PORT);
})




async function preprocessRequest(reqID, jsondata) {
  let request = new Request(jsondata);

  console.log('WH: Starting process request: ', reqID, request.Type, request.MediaTitle);

  let loadedrequest = null;


  loadedrequest = Request.find({
    TmdbId: request.TmdbId
  });

  if ( !loadedrequest ) {
    console.log(`WH: [${reqID}]`, 'no request found by TMDB', request.TmdbId);
    loadedrequest = Request.find({
      CleanedMediaTitle: request.CleanedMediaTitle
    });
  }

  if ( !loadedrequest ) {
    console.log(`WH: [${reqID}]`, 'no request found by cleaned title', request.CleanedMediaTitle);
    loadedrequest = Request.find({
      MediaTitle: request.MediaTitle
    });
  }

  if ( loadedrequest ) {

    reqID = `${reqID}-${loadedrequest.RequestID}`;

    console.log(`WH: [${reqID}]`, 'we found an older request in', loadedrequest.Type, 'by', loadedrequest.RequestedByUsername);

    loadedrequest.Type = request.Type;
    loadedrequest.RequestedByUsername = request.RequestedByUsername;

    request = loadedrequest;

  } else {
    console.log(`WH: [${reqID}]`, 'no request found by title', request.MediaTitle);
  }


  console.log('WH: Saving request into DB', JSON.stringify(request));
  request.save();

  processRequest( reqID, request );
}


async function processRequest(reqID, request) {


  console.log(`WH: [${reqID}]`, 'Getting template', request.Type);

  let tmpl = Templates[ request.Type ];


  if ( tmpl ) {


    if ( tmpl.admin ) {

      console.log(`WH: [${reqID}]`, 'template for admin notification found');

      let tmpldata = await tmpl.admin( request.toJSON() );

      if ( TelegramBot.BotAdminEnabled ) {
        TelegramBot.sendNotificationToMonitor( tmpldata.poster, tmpldata.html, `${request.Type} - ${request.MediaTitle}` )
      } else {
        console.log('WH: ', tmpldata.html );
      }

    }

    if ( tmpl.users ) {

      console.log(`WH: [${reqID}]`, 'template for users notification found');

      let tmpldata = await tmpl.users( request.toJSON() );

      if ( TelegramBot.Enabled ) {

        await TelegramBot.publish( tmpldata.poster, tmpldata.html )

      } else {

        console.log('WH: ', tmpldata.html );

      }

    }



  } else {

    console.log(`WH: [${reqID}]`, 'NO template found');

  }


}



module.exports = {preprocessRequest, processRequest};


