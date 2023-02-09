const Path = require('path');
const {Config, Trakt} = require('../utils');
const {PlexQuery} = require('../plex');
const FS = require('fs');
const {GetUserRequest, GetPoster, Labels, IMDB_RatingKey} = require('./template_utils');

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


module.exports = async function({scraped, plexItem}, {Name}) {

  let p_poster = GetPoster({scraped, plexItem}, {Name});

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
    cast = scraped.Cast.slice(0, 5).join(', ');
  } else if ( plexItem.Role && plexItem.Role.length ) {
    cast = plexItem.Role.slice(0, 5).map( c => c.tag ).join(', ');
  }

  let summary = '';
  if (plexItem.summary ) {
    summary = plexItem.summary;
  } else if ( scraped.Description ) {
    summary = scraped.Description;
  }

  if ( Config.PLOT_LIMIT && summary.length > Config.PLOT_LIMIT ) {
    summary = `${summary.slice(0, Config.PLOT_LIMIT)}...`;
  }

  let trailer_link = '';

  const votesStr = [];

  if ( scraped.ImdbData ) {
    let imdb_link = `<a href="https://www.imdb.com/title/${scraped.ImdbData.imdbid}">IMDB</a>`;
    let vote = plexItem.rating || scraped.ImdbData.rating || scraped.Vote;
    if ( vote ) {
      votesStr.push(`${vote.toFixed(1)} - ${imdb_link}`);
    }

    if (scraped.ImdbData.ratings) {
      for ( const rate of scraped.ImdbData.ratings ) {
        if ( rate.Source == IMDB_RatingKey) continue;
        try {
          votesStr.push(`${parseFloat(rate.Value)} - <i>${Labels[rate.Source] || rate.Source}</i>`);
        } catch(e) {
          console.log(`cannot add rating: ${rate.Source}-${rate.Value}`, e);
        }
      }

    }


    try {
      let traktMovie = await Trakt.getMovieByID( scraped.ImdbData.imdbid );

      let trakt_link = `<a href="https://trakt.tv/movies/${traktMovie.ids.slug}">TRAKT</a>`;
      if ( traktMovie.rating ) {
        votesStr.push(`${traktMovie.rating.toFixed(1)} - ${trakt_link}`);
      }

      if ( traktMovie.trailer ) {
        trailer_link = `<a href="${traktMovie.trailer}">Trailer</a>`;
      }
    } catch(e) {
      console.log(`[Template ${Name}] cannot get trakt info by ${scraped.ImdbData.imdbid}`, e);
    }

  }

  let mediaData = plexItem.Media.map( extractMediaData );
  let resolution = mediaData.map( res => res.videoRes ).filter( res => !!res );
  let audioCh = mediaData.map( res => res.audioCh ).filter( res => !!res );

  resolution = [... (new Set( resolution ) ) ].join(' / ');
  audioCh = [... (new Set( audioCh )  ) ].join(' / ');

  let sizes = [... (new Set( plexItem.Media.map(m => m.Part && m.Part[0] && m.Part[0].size).filter(s => !!s).map(formatBytes)) ) ].join(' / ');


  // 🏅

  if ( trailer_link ) {
    summary = `${summary} - ${trailer_link}`
  }

  let str = [
    `🎬 <b>${scraped.Title || plexItem.title}</b>`,
    `<i>aggiunto in ${Name}</i>`,
    '',
    year ? `<b>Anno:</b> ${year}` : 'NO',
    genres ? `<b>Genere:</b> ${genres}` : 'NO',
    director ? `<b>Regia:</b> ${director}` : 'NO',
    cast ? `<b>Cast:</b> ${cast}` : 'NO',
    '',
    resolution ? `<b>Risoluzione:</b> ${resolution}` : 'NO',
    audioCh ? `<b>Canali Audio:</b> ${audioCh}` : 'NO',
    `<b>Dimensione:</b> ${sizes}`,
    '',
    summary ? summary : 'NO',
    '',
    (votesStr.length > 0) ? '<b>Voto</b>' : 'NO',
    // imdb_link ? imdb_link : 'NO',
    // trakt_link ? trakt_link : 'NO',
    ...votesStr,
    Config.PC_NAME ? `- ${Config.PC_NAME} -` : 'NO'
  ];


  let request = GetUserRequest(scraped.Id, scraped.Title || plexItem.title, scraped.Year || plexItem.year);

  if ( request ) {
    str.unshift(
      `🏅 <b>Richiesta soddisfatta!</b> 🏅`
    )
  }

  return p_poster.then( (poster) => {
    return Promise.resolve( {
      poster,
      html: str.filter(row => row != 'NO').join('\n'),
    });
  });
}
