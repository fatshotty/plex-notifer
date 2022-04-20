
if ( process.env.ENV_FILE_PATH ) {
  require('dotenv').config({path: process.env.ENV_FILE_PATH});
} else {
  require('dotenv').config()
}


const Path = require('path');
const FS = require('fs');

const TraktService = require('./trakt');

const Config = {
  PLEX_IP: process.env.PLEX_IP,
  PLEX_PORT: process.env.PLEX_PORT,
  PLEX_USER: process.env.PLEX_USER,
  PLEX_PASSWORD: process.env.PLEX_PASSWORD,
  PLEX_IDENTIFIER: process.env.PLEX_IDENTIFIER,

  CRON: process.env.CRON,

  DATAFOLDER: process.env.DATA_FOLDER || Path.join(__dirname, 'data'),
  ENABLE_WEBHOOK: process.env.ENABLE_WEBHOOK == 'true',
  BIND_WEBHOOK: process.env.BIND_WEBHOOK,

  REMOUNT_COMMAND: process.env.REMOUT_COMMAND,

  TEMP_DIR: Path.normalize(process.env.TEMP_DIR || __dirname),
  TEMPLATE_DIR: Path.join( __dirname, 'templates'),

  IMDB_API_KEY: process.env.IMDB_API_KEY,
  TMDB_API_KEY: process.env.TMDB_API_KEY,
  TVDB_API_KEY: process.env.TVDB_API_KEY,

  TRAKT: {
    client_id: process.env.TRAKT_CLIENT_ID,
    client_secret: process.env.TRAKT_CLIENT_SECRET
  },

  MDBLIST_API_ID: process.env.MDBLIST_API_ID,

  TELEGRAM_BOT_ID: process.env.TELEGRAM_BOT_ID,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,

  TELEGRAM_LOG_CHAT_ID: process.env.TELEGRAM_LOG_CHAT_ID,
  TELEGRAM_LOG_BOT_ID: process.env.TELEGRAM_LOG_BOT_ID,

  PLEX_SKIP_LIBRARY: (process.env.PLEX_SKIP_LIBRARY || '').split(',').map(l => l.trim()).filter(l => !!l),

  IMMEDIATE: process.env.IMMEDIATE == 'true',

  PC_NAME: process.env.PC_NAME,

  PLEX_LIBRARY_SKIP_SCRAPE: (process.env.PLEX_LIBRARY_SKIP_SCRAPE || '').split(',').map( l => l.trim() ).filter( l => !!l),

  PLOT_LIMIT: parseInt(process.env.PLOT_LIMIT || 0, 10),

  ROOT_MEDIA_FOLDER: process.env.ROOT_MEDIA_FOLDER,

  HEALT_CHECK_CRON: process.env.HEALT_CHECK_CRON,

  ConfigFile: {}

};

Config.TraktTokenFile = process.env.TRAKT_TOKEN_FILE || Path.join(Config.TEMP_DIR, 'trakt-tokens.json');

if ( ! FS.existsSync(Config.TEMP_DIR) ) {
  console.log(`${Config.TEMP_DIR} doesn't exists, creating`);
  FS.mkdirSync(Config.TEMP_DIR, {recursive: true});
}

let configFilePath = Path.join(Config.TEMP_DIR, 'plex-notifier.json')


try {
  let data = require( configFilePath );
  Config.ConfigFile = data;
} catch( e ) {
  console.log(`[WARN] cannot load config file ${e.message}`);
  // FS.writeFileSync(configFilePath, '{}', {encoding: 'utf-8'});
  Config.ConfigFile = {};
}


function saveConfig() {
  FS.writeFileSync(configFilePath, JSON.stringify(Config.ConfigFile, null, 2), {encoding: 'utf-8'});
}


const Trakt = new TraktService(Config.TRAKT);


module.exports = {
  Config,
  saveConfig,
  TelgramBot: {
    Slimbot: null,
    SlimbotLog: null
  },
  Trakt
};
