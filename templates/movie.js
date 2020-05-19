const Path = require('path');
const {Config} = require('../utils');

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
    console.error(`cannot extract mediadata from ${filename} - ${e.message}` );
  }

  return {videoRes, audioCh};
}


module.exports = function(scraped, plexItem, library) {

  let year = scraped.Year || plexItem.year;

  let genres = '';
  if ( scraped.Genres && scraped.Genres.length ) {
    genres = scraped.Genres.slice(0, 3).join(', ')
  } else if ( plexItem.Genre && plexItem.Genre.length ) {
    genres = plexItem.Genre.slice(0, 3).map( g => g.tag ).join(', ');
  }

  let director = '';
  if ( scraped.Directors && scraped.Directors.length ) {
    director = scraped.Directors.slice(0, 2).join(', ');
  } else if ( plexItem.Director && plexItem.Director.length ) {
    director =plexItem.Director.slice(0, 2).map( d => d.tag ).join(', ');
  }

  let cast = '';
  if ( scraped.Cast && scraped.Cast.length ) {
    cast = scraped.Cast.slice(0, 3).join(', ');
  } else if ( plexItem.Role && plexItem.Role.length ) {
    cast = plexItem.Role.slice(0, 3).map( c => c.tag ).join(', ');
  }

  let summary = '';
  if (plexItem.summary ) {
    summary = plexItem.summary;
  } else if ( scraped.Description ) {
    summary = scraped.Description;
  }

  if ( summary.length > 150 ) {
    summary = `${summary.slice(0, 300)}...`;
  }

  let imdb_link = '';
  if ( scraped.ImdbData ) {
    imdb_link = `<a href="https://www.imdb.com/title/${scraped.ImdbData.imdbid}">IMDB</a>`;
    let vote = plexItem.rating || (scraped.ImdbData && scraped.ImdbData.rating) || scraped.Vote;
    if ( vote ) {
      imdb_link +=  ` ↗️   Voto: ${vote}`;
    }
  }

  let mediaData = plexItem.Media.map( extractMediaData );
  let resolution = mediaData.map( res => res.videoRes ).filter( res => !!res ).join(' / ');
  let audioCh = mediaData.map( res => res.audioCh ).filter( res => !!res ).join(' / ');

  let str = [
    `🎬 <b>${scraped.Title || plexItem.title}</b>`,
    '',
    year ? `<b>Anno:</b> ${year}` : 'NO',
    genres ? `<b>Genere:</b> ${genres}` : 'NO',
    director ? `<b>Regia:</b> ${director}` : 'NO',
    cast ? `<b>Cast:</b> ${cast}` : 'NO',
    '',
    resolution ? `<b>Risoluzione:</b> ${[... (new Set( plexItem.Media.map(m => m.videoResolution).filter(vr => !!vr) )) ].join(' / ')}` : 'NO',
    audioCh ? `<b>Canali Audio:</b> ${[... (new Set( plexItem.Media.map(m => m.audioChannels).filter(ac => !!ac) )) ].join(' / ')}` : 'NO',
    `<b>Dimensione:</b> ${[... (new Set( plexItem.Media.map(m => m.Part && m.Part[0] && m.Part[0].size).filter(s => !!s).map(formatBytes)) ) ].join(' / ')}`,
    '',
    summary ? summary : 'NO',
    '',
    imdb_link ? imdb_link : 'NO',
    Config.PC_NAME ? `- ${Config.PC_NAME} -` : 'NO'
  ]

  return str.filter(row => row != 'NO').join('\n');
}
