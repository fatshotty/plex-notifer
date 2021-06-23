// const Scraper = require('./scraper/scraper');
// const TVDB = Scraper.TVDB;


// TVDB.getInfo('372996', 'tv').then( (klass) => {
//     resolve( {scraped: klass, plexItem} );
// }).catch( (err) => {
// console.error( `${this.JobName} - ${title} (${year}) - error during 'getInfo' - ${err.message}` );
// return resolve( {scraped: null, plexItem} );
// });


const {preprocessRequest} = require('./webhook/webhook');


// FILM REQUESTED
preprocessRequest( 0, {
  notification_type: 'MEDIA_PENDING',
  mediatitle: 'High Life (2018)',
  plot: "Paranormal investigators Ed and Lorraine Warren encounter what would become one of the most sensational cases from their files. The fight for the soul of a young boy takes them beyond anything they'd ever seen before, to mark the first time in U.S. history that a murder suspect would claim demonic possession as a defense.",
  poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/xbSuFiJbbBWCkyCCKIMfuDCA4yV.jpg',
  email: '',
  username: '',
  avatar: '',
  media: {
    media_type: 'movie',
    tmdbId: '423108',
    imdbId: '',
    tvdbId: '',
    status: 'PENDING',
    status4k: 'UNKNOWN'
  },
  extra: [],
  request: {
    request_id: '6',
    requestedBy_email: 'fabio.tunno@gmail.com',
    requestedBy_username: 'fatshotty',
    requestedBy_avatar: 'https://plex.tv/users/29779461bb6e4b0e/avatar?c=1620060655'
  }
})


// FILM REFUSED
// preprocessRequest(0, {
//   notification_type: 'MEDIA_DECLINED',
//   mediatitle: 'The Conjuring: The Devil Made Me Do It (2021)',
//   plot: "Paranormal investigators Ed and Lorraine Warren encounter what would become one of the most sensational cases from their files. The fight for the soul of a young boy takes them beyond anything they'd ever seen before, to mark the first time in U.S. history that a murder suspect would claim demonic possession as a defense.",
//   poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/xbSuFiJbbBWCkyCCKIMfuDCA4yV.jpg',
//   email: 'fabio.tunno@gmail.com',
//   username: 'fatshotty',
//   avatar: 'https://plex.tv/users/29779461bb6e4b0e/avatar?c=1620060655',
//   media: {
//     media_type: 'movie',
//     tmdbId: '423108',
//     imdbId: '',
//     tvdbId: '',
//     status: 'PENDING',
//     status4k: 'UNKNOWN'
//   },
//   extra: [],
//   request: {
//     request_id: '7',
//     requestedBy_email: 'fabio.tunno@gmail.com',
//     requestedBy_username: 'fatshotty',
//     requestedBy_avatar: 'https://plex.tv/users/29779461bb6e4b0e/avatar?c=1620060655'
//   }
// })


// FILM APPROVED
// preprocessRequest(0, {
//   notification_type: 'MEDIA_APPROVED',
//   mediatitle: 'The Conjuring: The Devil Made Me Do It (2021)',
//   plot: "Paranormal investigators Ed and Lorraine Warren encounter what would become one of the most sensational cases from their files. The fight for the soul of a young boy takes them beyond anything they'd ever seen before, to mark the first time in U.S. history that a murder suspect would claim demonic possession as a defense.",
//   poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/xbSuFiJbbBWCkyCCKIMfuDCA4yV.jpg',
//   email: 'fabio.tunno@gmail.com',
//   username: 'fatshotty',
//   avatar: 'https://plex.tv/users/29779461bb6e4b0e/avatar?c=1620060655',
//   media: {
//     media_type: 'movie',
//     tmdbId: '423108',
//     imdbId: '',
//     tvdbId: '',
//     status: 'PENDING',
//     status4k: 'UNKNOWN'
//   },
//   extra: [],
//   request: {
//     request_id: '8',
//     requestedBy_email: 'fabio.tunno@gmail.com',
//     requestedBy_username: 'fatshotty',
//     requestedBy_avatar: 'https://plex.tv/users/29779461bb6e4b0e/avatar?c=1620060655'
//   }
// })

// preprocessRequest(0, {
//   notification_type: 'MEDIA_AVAILABLE',
//   mediatitle: 'The Conjuring: The Devil Made Me Do It (2021)',
//   plot: "Paranormal investigators Ed and Lorraine Warren encounter what would become one of the most sensational cases from their files. The fight for the soul of a young boy takes them beyond anything they'd ever seen before, to mark the first time in U.S. history that a murder suspect would claim demonic possession as a defense.",
//   poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/xbSuFiJbbBWCkyCCKIMfuDCA4yV.jpg',
//   email: 'fabio.tunno@gmail.com',
//   username: 'fatshotty',
//   avatar: 'https://plex.tv/users/29779461bb6e4b0e/avatar?c=1620060655',
//   media: {
//     media_type: 'movie',
//     tmdbId: '423108',
//     imdbId: '',
//     tvdbId: '',
//     status: 'AVAILABLE',
//     status4k: 'UNKNOWN'
//   },
//   extra: [],
//   request: {
//     request_id: '8',
//     requestedBy_email: 'fabio.tunno@gmail.com',
//     requestedBy_username: 'fatshotty',
//     requestedBy_avatar: 'https://plex.tv/users/29779461bb6e4b0e/avatar?c=1620060655'
//   }
// })
