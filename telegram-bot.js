const {Config, TelgramBot} = require('./utils');
const Telegram = require('slimbot');


if ( !TelgramBot.Slimbot && Config.TELEGRAM_BOT_ID ) {
  TelgramBot.Slimbot = new Telegram(Config.TELEGRAM_BOT_ID);
}

if ( !TelgramBot.SlimbotLog && Config.TELEGRAM_LOG_BOT_ID) {
  TelgramBot.SlimbotLog = new Telegram(Config.TELEGRAM_LOG_BOT_ID);
}

let Slimbot = TelgramBot.Slimbot; 
let SlimbotLog = TelgramBot.SlimbotLog; 

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


async function sendNotificationToMonitor(posterUrl, html, title) {
  title = title || html.split('\n').shift();
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
  try {

    await SlimbotLog[ method ](Config.TELEGRAM_LOG_CHAT_ID, posterUrl, opts )
    console.log(`[TelgramBot] Successfull sent to telegram ${title}, waiting for queue...`);
    // setTimeout( resolve, 5000);

  } catch(e) {

    console.log(`[ERROR telegram] ${title} ${!isUrl ? '(buff)' : ''} - ${e.message}`);
    SlimbotLog.sendMessage(Config.TELEGRAM_LOG_CHAT_ID, `[Noty-Error] ${title} ${!isUrl ? '(buff)' : ''} - ${e.message}`, {
      parse_mode: "html",
      disable_web_page_preview: false,
      disable_notification: false
    });
  }

}


function sendError(title, err) {
  SlimbotLog.sendMessage(Config.TELEGRAM_LOG_CHAT_ID, `[Noty-Error] ${title} - ${err.message}`, {
    parse_mode: "html",
    disable_web_page_preview: false,
    disable_notification: false
  });
}

function publishHtml(html) {
  Slimbot.sendMessage(Config.TELEGRAM_CHAT_ID, html, {
    parse_mode: "html",
    disable_web_page_preview: false,
    disable_notification: false
  });
}


function callbackMessage(title, msg, buttons, cb) {
  let params = {
    parse_mode: 'html',
    reply_markup: JSON.stringify({
      inline_keyboard: [buttons.map( (btn) => {
        return { text: btn.text, callback_data: btn.action }
      })]
    }),
    disable_web_page_preview: false,
    disable_notification: false
  };


  SlimbotLog.off('callback_query');
  if ( cb ) {
    SlimbotLog.on('callback_query', query => {
      console.log(`[INFO telegram] ${title} - ${msg} GOT BUTTON PRESSED: ${query.data}`);
      if ( !cb ) {
        console.log(`[WARN telegram] ${title} - ${msg} NO ACTION FOR: ${query.data}`);
      } else {
        cb( query.data );
      }
      setTimeout(resetCallbackQuery, 1000);
    });
  }
  SlimbotLog.sendMessage(Config.TELEGRAM_LOG_CHAT_ID, `[Noty-Error] ${title} - ${msg}`, params);
}

let BotAdminEnabled = !!(Config.TELEGRAM_LOG_BOT_ID && Config.TELEGRAM_LOG_CHAT_ID);
if (BotAdminEnabled) {
  SlimbotLog.startPolling();
}


function resetCallbackQuery() {
  SlimbotLog.off('callback_query');
  SlimbotLog.on('callback_query', query => {
    SlimbotLog.sendMessage(Config.TELEGRAM_LOG_CHAT_ID, `*no callback enabled*`, {
      parse_mode: "html",
      disable_web_page_preview: false,
      disable_notification: true
    });
  });
}

module.exports = {
  Enabled: !!(Config.TELEGRAM_BOT_ID && Config.TELEGRAM_CHAT_ID),
  BotAdminEnabled,
  publish,
  sendNotificationToMonitor,
  sendError,
  publishHtml,
  callbackMessage
};
