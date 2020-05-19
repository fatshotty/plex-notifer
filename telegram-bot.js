const {Config} = require('./utils');
const Telegram = require('slimbot');

const Slimbot = new Telegram(Config.TELEGRAM_BOT_ID);


let queue = [];
let interval = null;
let FREE = true;


function publish(posterUrl, html) {
  queue.push({posterUrl, html});
  if ( FREE ) send();
  return Promise.resolve();
}


function send() {
  let data = queue.shift();
  if ( !data ) {
    return FREE = true;
  }
  FREE = false;
  return _send(data.posterUrl, data.html).then( () => {
    send();
  })
}


function _send(posterUrl, html) {
  return new Promise( (resolve, reject) => {
    Slimbot.sendPhoto(Config.TELEGRAM_CHAT_ID, posterUrl, {
      parse_mode: "html",
      disable_web_page_preview: false,
      disable_notification: false,
      caption: html
    })
    .then( () => {
      console.log(`Successfull send to telegram, waiting...`);
      setTimeout( resolve, 5000);
    })
    .catch( (e) => {
      console.log(`[ERROR telegram] ${e.message}`);
      resolve();
    });
  })
}

module.exports = {
  Enabled: Config.TELEGRAM_BOT_ID && Config.TELEGRAM_CHAT_ID,
  publish
};
