const Path = require('path');
const {Config, Trakt} = require('../utils');
const {PlexQuery} = require('../plex');
const FS = require('fs');
const {GetUserRequest, GetPoster, extractMediaData} = require('./template_utils');

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


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

  if ( item.ExternalUrls ) {
    const imdb = item.ExternalUrls.find(u => u.Name == 'IMDb');
    if (imdb) {
      let imdb_link = `<a href="${imdb.Url}">IMDB</a>`;
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

  let mediaData = [];
  let resolution = [];
  let audioCh = [];

  mediaData = mediaData.concat( item.MediaSources.map( extractMediaData )  );

  for( const md of mediaData) {
    resolution = resolution.concat( md.videoRes.filter( res => !!res ) );
    audioCh = audioCh.concat( md.audioCh.filter( res => !!res ) );
  }

  resolution = [... (new Set( resolution ) ) ].join(' / ');
  audioCh = [... (new Set( audioCh )  ) ].join(' / ');

  // let sizes = [... (new Set( plexItem.Media.map(m => m.Part && m.Part[0] && m.Part[0].size).filter(s => !!s).map(formatBytes)) ) ].join(' / ');


  // 🏅

  if ( trailer_link ) {
    summary = `${summary} - ${trailer_link}`
  }

  let str = [
    `🎬 <b>${item.Name}</b>`,
    `<i>aggiunto in ${Name}</i>`,
    '',
    year ? `<b>Anno:</b> ${year}` : 'NO',
    genres ? `<b>Genere:</b> ${genres}` : 'NO',
    director ? `<b>Regia:</b> ${director}` : 'NO',
    cast ? `<b>Cast:</b> ${cast}` : 'NO',
    '',
    resolution ? `<b>Risoluzione:</b> ${resolution}` : 'NO',
    audioCh ? `<b>Canali Audio:</b> ${audioCh}` : 'NO',
    '',
    summary ? summary : 'NO',
    '',
    (votesStr.length > 0) ? '<b>Voto</b>' : 'NO',
    // imdb_link ? imdb_link : 'NO',
    // trakt_link ? trakt_link : 'NO',
    ...votesStr,
    Config.PC_NAME ? `- ${Config.PC_NAME} -` : 'NO'
  ];


  const tmdbId = item.ProviderIds && item.ProviderIds.Tmdb;
  if (tmdbId) {
    let request = GetUserRequest(tmdbId, item.Name, item.ProductionYear);

    if ( request ) {
      str.unshift(
        `🏅 <b>Richiesta soddisfatta!</b> 🏅`
      )
    }
  }

  return p_poster.then( (poster) => {
    return Promise.resolve( {
      poster,
      html: str.filter(row => row != 'NO').join('\n'),
    });
  });
}
