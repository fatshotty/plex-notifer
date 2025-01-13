const Path = require('path');
const {Config, Trakt} = require('../utils');
const {PlexQuery} = require('../plex');
const FS = require('fs');
const {GetUserRequest, GetPoster, extractMediaData} = require('./template_utils');

// function extractMediaData(media) {

//   let videoRes = media.videoResolution;
//   let audioCh = media.audioChannels;

//   let filename = media.Part && media.Part[0].file;

//   filename = Path.basename( filename );

//   let lastIndex = filename.lastIndexOf('-');
//   let details = filename.substring(lastIndex + 1).trim();


//   details = details.substring(0, details.lastIndexOf('.') );
//   details = details.split(' ');

//   // 1080p x265 AC3 5.1 9.3GB.mkv

//   // remove dimension
//   details.pop();

//   try {
//     audioCh = parseFloat(audioCh || details.pop()).toFixed(1);

//     videoRes = videoRes || details.shift();
//     if ( isNaN( Number(videoRes.charAt(0) ) )  ) {
//       videoRes = details.shift();
//     }

//   } catch(e) {
//     console.error(`[Template] cannot extract mediadata from ${filename} - ${e.message}` );
//   }

//   return {videoRes, audioCh};
// }


module.exports = async function(item, {Name}) {

  let p_poster = GetPoster(item, {Name});

  let year = item.ProductionYear;

  let genres = '';
  if ( item.Genres && item.Genres.length ) {
    genres = item.Genres.slice(0, 3).join(', ')
  }

  let director = '';
  let cast = '';
  if (item.People) {
    const dir = item.People.find(p => p.Type == 'Director');
    if (dir) {
      director = dir.Name;
    }

    const actors = item.People.filter(p => p.Type == 'Actor');
    cast = actors.slice(0, 5).map(i => i.Name).join(', ');

  }

  
  let summary = item.Overview;

  if ( Config.PLOT_LIMIT && summary.length > Config.PLOT_LIMIT ) {
    summary = `${summary.slice(0, Config.PLOT_LIMIT)}...`;
  }

  let trailer_link = '';

  const votesStr = [];
  let imdb_link = ''

  if ( item.ExternalUrls ) {
    const imdb = item.ExternalUrls.find(u => u.Name == 'IMDb');
    if (imdb) {
      imdb_link = `<a href="${imdb.Url}">IMDB</a>`;
      if (item.CommunityRating) {
        votesStr.push(`${item.CommunityRating.toFixed(1)} - ${imdb_link}`);  
      }
    }
    
    // let vote = plexItem.rating || scraped.ImdbData.rating || scraped.Vote;
    // if ( vote ) {
    //   votesStr.push(`${vote.toFixed(1)} - ${imdb_link}`);
    // }

    // if (scraped.ImdbData.ratings) {
    //   for ( const rate of scraped.ImdbData.ratings ) {
    //     if ( rate.Source == IMDB_RatingKey) continue;
    //     try {
    //       votesStr.push(`${parseFloat(rate.Value)} - <i>${Labels[rate.Source] || rate.Source}</i>`);
    //     } catch(e) {
    //       console.log(`cannot add rating: ${rate.Source}-${rate.Value}`, e);
    //     }
    //   }

    // }


    // try {
    //   let traktMovie = await Trakt.getMovieByID( scraped.ImdbData.imdbid );

    //   let trakt_link = `<a href="https://trakt.tv/movies/${traktMovie.ids.slug}">TRAKT</a>`;
    //   if ( traktMovie.rating ) {
    //     votesStr.push(`${traktMovie.rating.toFixed(1)} - ${trakt_link}`);
    //   }

    //   if ( traktMovie.trailer ) {
    //     trailer_link = `<a href="${traktMovie.trailer}">Trailer</a>`;
    //   }
    // } catch(e) {
    //   console.log(`[Template ${Name}] cannot get trakt info by ${scraped.ImdbData.imdbid}`, e);
    // }

  }


  let resolution = [];
  let audioCh = [];

  let mediaData = []
  for (const seas of item.Seasons ) {
    for (const ep of seas.Episodes ) {
      mediaData = mediaData.concat( ep.MediaSources.map( extractMediaData )  );

      for( const md of mediaData) {
        resolution = resolution.concat( md.videoRes.filter( res => !!res ) );
        audioCh = audioCh.concat( md.audioCh.filter( res => !!res ) );
      }

    }
  }

  resolution = [... (new Set( resolution ) ) ].join(' / ');
  audioCh = [... (new Set( audioCh )  ) ].join(' / ');

  // if ( plexItem.Media ) {
  //   let mediaData = plexItem.Media.map( extractMediaData );
  //   resolution = mediaData.map( res => res.videoRes ).filter( res => !!res );
  //   audioCh = mediaData.map( res => res.audioCh ).filter( res => !!res );

  //   resolution = [... (new Set( resolution ) ) ].join(' / ');
  //   audioCh = [... (new Set( audioCh )  ) ].join(' / ');
  // }

  // let seasons = item.Seasons && Object.keys(plexItem.Seasons).map( (s) => {
  //     let match = s.match( /\s(\d+)$/i )
  //     if ( match && match[1] ) {
  //       return match[1]
  //     }
  //   }).filter( m => !!m ).map( m => Number(m) ).filter( n => !!n ).sort( (n1, n2) => n1 > n2 ? 1 : -1);


  let studios = '';
  if ( item.Studios && item.Studios.length > 0 ) {
    studios = item.Studios.map(s => s.Name).filter(n => !!n).join(', ');
  }


  if ( trailer_link ) {
    summary = `${summary} - ${trailer_link}`
  }

  // 🏅

  let str = [
    `📺 <b>${item.Name}</b>`,
    `<i>aggiunto in ${Name}</i>`,
    '',
    (item.Seasons && item.Seasons.length) ? 
      `<b>Stagion${item.Seasons.length > 1 ? 'i' : 'e'}:</b> ${item.Seasons.filter(s => !!s.IndexNumber).map(s => s.IndexNumber).join( ' - ')}`
      : 'NO',
    (item.Seasons && item.Seasons.length) ? '' : 'NO', // empty line if seasons exist
    year ? `<b>Anno:</b> ${year}` : 'NO',
    genres ? `<b>Genere:</b> ${genres}` : 'NO',
    cast ? `<b>Cast:</b> ${cast}` : 'NO',
    studios ? `<b>Studios:</b> ${studios}` : 'NO',
    '',
    resolution ? `<b>Risoluzione:</b> ${resolution}` : 'NO',
    audioCh ? `<b>Canali Audio:</b> ${audioCh}` : 'NO',
    '',
    summary ? summary : 'NO',
    '',
    (votesStr.length > 0) ? '<b>Voto</b>' : 'NO',
    ...votesStr,
    Config.PC_NAME ? `- ${Config.PC_NAME} -` : 'NO'
  ];


  let request = GetUserRequest(item.Id, item.Name, year);

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
