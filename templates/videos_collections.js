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
  let _filename = filename.substring(0, lastIndex);
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

  return {videoRes, audioCh, filename: _filename};
}


function extractFilename(media) {
  let part = media.Part[0];
  return {
    key: part.key,
    filename: Path.basename(part.file, Path.extname(part.file))
  };

}


function computeFilename(file, pTitle, lastScan) {

  let keyParts = file.key.split('/');
  let timestamp = Number(keyParts.pop() && keyParts.pop());

  if ( timestamp < lastScan) {
    return null;
  }


  if ( pTitle ) {
    let title = pTitle.toLowerCase();
    let filen = file.filename;
    let fn = filen.toLowerCase();
    if ( fn.indexOf(title) == 0 ) {
      filen = filen.substring(title.length).trim();
    }
    file.filename = filen.startsWith('-') ? filen.substring(1).trim() : filen;
  }

  return file.filename;


}

module.exports = function({scraped, plexItem}, {Name, LastScan}) {


  // let p_poster = new Promise( (resolve, reject) => {
  //   if ( plexItem.thumb ) {

  //     console.log(`[Template ${Name}] use thumnail ${plexItem.thumb}`);
  //     PlexQuery(plexItem.thumb).then( (buff) => {
  //       let fn = `./temp_thumb_${Date.now()}.png`;
  //       FS.writeFileSync(fn, buff, {encoding: 'binary'});
  //       let rs = FS.createReadStream(fn);
  //       rs.on('end', () => {
  //         FS.unlinkSync(fn);
  //       });
  //       resolve( rs );
  //     });

  //   }  else if ( plexItem.art ) {

  //     console.log(`[Template ${Name}] use fanart ${plexItem.art}`);
  //     PlexQuery(plexItem.art).then( (buff) => {
  //       let fn = `./temp_art_${Date.now()}.png`;
  //       FS.writeFileSync(fn, buff, {encoding: 'binary'});
  //       let rs = FS.createReadStream(fn);
  //       rs.on('end', () => {
  //         FS.unlinkSync(fn);
  //       });
  //       resolve( rs );
  //     });

  //   } else {
  //     resolve( '' );
  //   }

  // });

  let mediaData = plexItem.Media.map( extractMediaData );
  let filenames = plexItem.Media.map(extractFilename);
  let resolution = mediaData.map( res => res.videoRes ).filter( res => !!res );
  let audioCh = mediaData.map( res => res.audioCh ).filter( res => !!res );


  filenames = filenames.map( fn => computeFilename(fn, plexItem.title, LastScan) ).filter(Boolean);



  resolution = [... (new Set( resolution ) ) ].join(' / ');
  audioCh = [... (new Set( audioCh )  ) ].join(' / ');

  let str = [
    `📼 <b>${plexItem.title}</b>`,
    `<i>aggiunto in ${Name}</i>`,
    '',
    filenames.slice(0, 7).map(f => `<i>${f}</i>`).join('\n'),
    filenames.length > 7 ? `<i>...altri ${filenames.length - 7}...</i>\n` : '',
    `<b>Collezione:</b> ${plexItem.Media.length} video`,
    resolution ? `<b>Risoluzione:</b> ${resolution}` : 'NO',
    audioCh ? `<b>Canali Audio:</b> ${audioCh}` : 'NO',
    Config.PC_NAME ? `- ${Config.PC_NAME} -` : 'NO'
  ]

  // return p_poster.then( poster => {
    return Promise.resolve( {
      poster: null,
      html: str.filter(row => row != 'NO').join('\n'),
    });
  // });
}
