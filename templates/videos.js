const Path = require('path');
const {Config} = require('../utils');
const {PlexQuery} = require('../plex');
const FS = require('fs');

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
    console.error(`[Template ${library}] cannot extract mediadata from ${filename} - ${e.message}` );
  }

  return {videoRes, audioCh};
}


module.exports = function({scraped, plexItem}, {Name}) {

  let mediaData = plexItem.Media.map( extractMediaData );
  let resolution = mediaData.map( res => res.videoRes ).filter( res => !!res );
  let audioCh = mediaData.map( res => res.audioCh ).filter( res => !!res );

  resolution = [... (new Set( resolution ) ) ].join(' / ');
  audioCh = [... (new Set( audioCh )  ) ].join(' / ');

  let str = [
    `📽 <b>${plexItem.title}</b>`,
    `<i>aggiunto in ${Name}</i>`,
    '',
    resolution ? `<b>Risoluzione:</b> ${resolution}` : 'NO',
    audioCh ? `<b>Canali Audio:</b> ${audioCh}` : 'NO',
    Config.PC_NAME ? `- ${Config.PC_NAME} -` : 'NO'
  ]

  return Promise.resolve( {
    poster: null,
    html: str.filter(row => row != 'NO').join('\n'),
  });
}
