const Path = require('path');
const {Config, formatBytes, extractMediaData} = require('../utils');
const {PlexQuery} = require('../plex');
const FS = require('fs');


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
