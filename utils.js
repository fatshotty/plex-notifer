require('dotenv').config();
const Path = require('path');
const FS = require('fs');

const Config = {
  PLEX_IP: process.env.PLEX_IP,
  PLEX_PORT: process.env.PLEX_PORT,
  PLEX_USER: process.env.PLEX_USER,
  PLEX_PASSWORD: process.env.PLEX_PASSWORD,
  PLEX_IDENTIFIER: process.env.PLEX_IDENTIFIER,

  CRON: process.env.CRON,

  TEMP_DIR: Path.normalize(process.env.TEMP_DIR || __dirname),
  TEMPLATE_DIR: Path.join( __dirname, 'templates'),

  IMDB_API_KEY: process.env.IMDB_API_KEY,
  TMDB_API_KEY: process.env.TMDB_API_KEY,
  TVDB_API_KEY: process.env.TVDB_API_KEY,

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
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  CATALOG_UUID: process.env.CATALOG_UUID,
  CATALOG_API_KEY: process.env.CATALOG_API_KEY,
  CATALOG_USER_UUID: process.env.CATALOG_USER_UUID,

  ConfigFile: {}
};



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


function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


function extractMediaData(media) {

  let videoRes = media.videoResolution;
  let audioCh = media.audioChannels;

  let filename = media.Part && media.Part[0].file;

  filename = Path.basename( filename );

  let lastIndex = filename.lastIndexOf('-');
  let details = filename.substring(lastIndex + 1).trim();


  details = details.substring(0, details.lastIndexOf('.') );
  details = details.split(' ');

  // 1080p x265 AC3 5.1 9.3GB.mkv

  // remove dimension
  details.pop();

  try {
    audioCh = parseFloat(audioCh || details.pop()).toFixed(1);

    videoRes = videoRes || details.shift();
    if ( isNaN( Number(videoRes.charAt(0) ) )  ) {
      videoRes = details.shift();
    }

  } catch(e) {
    console.error(`[Template] cannot extract mediadata from ${filename} - ${e.message}` );
  }

  return {videoRes, audioCh};
}


module.exports = {
  Config,
  saveConfig,
  formatBytes,
  extractMediaData
};
