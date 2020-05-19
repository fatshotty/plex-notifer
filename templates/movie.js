function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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


  let str = [
    `🎬 <b>${scraped.Title || plexItem.title}</b>`,
    '',
    year ? `<b>Anno:</b> ${year}` : 'NO',
    genres ? `<b>Genere:</b> ${genres}` : 'NO',
    director ? `<b>Regia:</b> ${director}` : 'NO',
    cast ? `<b>Cast:</b> ${cast}` : 'NO',
    '',
    `<b>Risoluzione:</b> ${[... (new Set( plexItem.Media.map(m => m.videoResolution).filter(vr => !!vr) )) ].join(' / ')}`,
    `<b>Canali Audio:</b> ${[... (new Set( plexItem.Media.map(m => m.audioChannels).filter(ac => !!ac) )) ].join(' / ')}`,
    `<b>Dimensione:</b> ${[... (new Set( plexItem.Media.map(m => m.Part && m.Part[0] && m.Part[0].size).filter(s => !!s).map(formatBytes)) ) ].join(' / ')}`,
    '',
    summary ? summary : 'NO',
    '',
    imdb_link ? imdb_link : 'NO'
  ]

  return str.filter(row => row != 'NO').join('\n');
}
