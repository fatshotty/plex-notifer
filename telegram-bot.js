const {Config} = require('./utils');
const Telegram = require('slimbot');

const Slimbot = new Telegram(Config.TELEGRAM_BOT_ID);
const SlimbotLog = new Telegram(Config.TELEGRAM_LOG_BOT_ID);


let queue = [];
let FREE = true;

function publish(posterUrl, html) {
  queue.push({posterUrl, html});
  if ( FREE ) send();
  return Promise.resolve();
}


function send() {
  let data = queue.shift();
  if ( !data ) {
    console.log(`[TelgramBot] empty telegram queue, mark as free`);
    return FREE = true;
  }
  FREE = false;
  return _send(data.posterUrl, data.html).then( () => {
    send();
  })
}


function _send(posterUrl, html) {
  return new Promise( (resolve, reject) => {
    let title = html.split('\n').shift();
    let isUrl = typeof posterUrl == 'string';
    console.log(`[TelgramBot] notifing to telegram: ${title} ${isUrl ? 'with poster url' : 'with poster object'}`);
    let method = 'sendPhoto';
    let opts = {
      parse_mode: "html",
      disable_web_page_preview: false,
      disable_notification: false,
      caption: html
    };
    if ( !posterUrl ) {
      method = 'sendMessage';
      delete opts.caption;
      posterUrl = html;
    }
    Slimbot[ method ](Config.TELEGRAM_CHAT_ID, posterUrl, opts )
      .then( () => {
        console.log(`[TelgramBot] Successfull sent to telegram ${title}, waiting for queue...`);
        setTimeout( resolve, 5000);
      })
      .catch( (e) => {
        console.log(`[ERROR telegram] ${title} ${!isUrl ? '(buff)' : ''} - ${e.message}`);
        SlimbotLog.sendMessage(Config.TELEGRAM_LOG_CHAT_ID, `[Noty-Error] ${title} ${!isUrl ? '(buff)' : ''} - ${e.message}`, {
          parse_mode: "html",
          disable_web_page_preview: false,
          disable_notification: false
        });
        resolve();
      });
  })
}


function sendError(title, err) {
  SlimbotLog.sendMessage(Config.TELEGRAM_LOG_CHAT_ID, `[Noty-Error] ${title} - ${err.message}`, {
    parse_mode: "html",
    disable_web_page_preview: false,
    disable_notification: false
  });
}


module.exports = {
  Enabled: Config.TELEGRAM_BOT_ID && Config.TELEGRAM_CHAT_ID,
  publish,
  sendError
};
