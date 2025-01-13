const Request = require('../webhook/models/Request')
const Got = require('got');
const FS = require('fs');
const {PlexQuery} = require('../plex');
const {EmbyRawQuery, EmbyURL} = require('../emby');
const Util = require('util');
const Stream = require('stream');


const IMDB_RatingKey = 'Internet Movie Database';

const Labels = {
  [IMDB_RatingKey]: 'IMDB',
  'Rotten Tomatoes': 'RottenTomatoes',
  'Metacritic': 'Metacritic'
}



function GetUserRequest(tmdbID, title, year) {

  let loadedrequest;

  if ( tmdbID ) {
    console.log('WH: Try to get the request from DB via TMDB', tmdbID );
    loadedrequest = Request.find({
      TmdbId: tmdbID
    });

  }

  let titleStr = `${title} (${year})`;

  if ( !loadedrequest ) {

    let cleanedTitle = Request.cleanMediaTitle( titleStr );

    console.log('WH: Try to get the request from DB via cleaned title-year:', cleanedTitle);

    loadedrequest = Request.find({
      CleanedMediaTitle: cleanedTitle
    });

  }

  if ( !loadedrequest ) {

    console.log('WH: Try to get the request from DB via title-year:', titleStr);

    loadedrequest = Request.find({
      MediaTitle: titleStr
    });

  }

  if (loadedrequest) {
    console.log('WH: request found!', loadedrequest.RequestID );
  }

  return loadedrequest;
};


function _getFileName() {
  return `./temp_poster_${Date.now()}.png`;
}


async function GetPoster(item, {Name}) {

  return new Promise( async (resolve, reject) => {
    try{
      const fn = _getFileName();

      let buff = await Got( EmbyURL(`Items/${item.Id}/Images/Primary`,'maxHeight=800&maxWidth=600&quality=50') ).buffer()

      FS.writeFileSync(fn, buff, {encoding: 'binary'});
      const rs = FS.createReadStream(fn);
      rs.on('end', () => {
        console.log(`[Template ${Name}] delete temp poster file: ${fn}`);
        FS.unlinkSync(fn);
      });
      resolve( rs );

    } catch(e) {
      // nothing
      reject();
    }
  })

  

  const p_poster = new Promise( async (resolve, reject) => {

    if ( scraped.Poster ) {

      // resolve( scraped.Poster );
      console.log(`[Template ${Name}] use poster ${scraped.Poster}`);
      let buff = await Got( scraped.Poster ).buffer();
      return resolve(buff)

    } else if (  scraped.Backdrop ) {

      console.log(`[Template ${Name}] use backdrop ${scraped.Backdrop}`);
      // resolve( scraped.Backdrop );
      let buff = await Got( scraped.Backdrop ).buffer();
      return resolve(buff);

    } else if ( plexItem.thumb ) {

      console.log(`[Template ${Name}] use thumbnail ${plexItem.thumb}`);
      return PlexQuery(plexItem.thumb).then(resolve);
      // .then( (buff) => {
      //   let fn = `./temp_thumb_${Date.now()}.png`;
      //   FS.writeFileSync(fn, buff, {encoding: 'binary'});
      //   let rs = FS.createReadStream(fn);
      //   rs.on('end', () => {
      //     FS.unlinkSync(fn);
      //   });
      //   resolve( rs );
      // });

    }  else if ( plexItem.art ) {

      console.log(`[Template ${Name}] use fanart ${plexItem.art}`);
      return PlexQuery(plexItem.art).then(resolve);
      // .then( (buff) => {
      //   let fn = `./temp_art_${Date.now()}.png`;
      //   FS.writeFileSync(fn, buff, {encoding: 'binary'});
      //   let rs = FS.createReadStream(fn);
      //   rs.on('end', () => {
      //     FS.unlinkSync(fn);
      //   });
      //   resolve( rs );
      // });

    } else {
      reject( new Error('no poster found') );
    }

  });



  return new Promise( (resolve, reject) => {
    p_poster.then( (buff) => {
      const fn = _getFileName();

      console.log(`[Template ${Name}] saving temp poster file in ${fn}`);

      FS.writeFileSync(fn, buff, {encoding: 'binary'});
      const rs = FS.createReadStream(fn);
      rs.on('end', () => {
        console.log(`[Template ${Name}] delete temp poster file: ${fn}`);
        FS.unlinkSync(fn);
      });
      resolve( rs );
    }).catch( (e) => {
      console.error(`[Error poster]`, e);
      resolve('');
    });
  });
}


function extractMediaData(media) {

  const data = {videoRes: '', audioCh: ''};

  if ( media.MediaStreams && media.MediaStreams.length > 0 ){
    // file has been correctly analysed

    const videoStreams = media.MediaStreams.filter( v => v.Type == "Video");
    const audioStreams = media.MediaStreams.filter( v => v.Type == "Audio");
    
    data.videoRes = videoStreams.map( v => `${v.DisplayTitle || v.ExtendedVideoType}`);
    data.audioCh = audioStreams.map( a => {
      let lng = (a.Language || 'ita').toLowerCase();
      if (lng === 'und') { lng = 'ita' }
      return `${lng.substring(0, 3)} (${Number(a.Channels || 2).toFixed(1)})`;
    })
  
  
  } else {

    // file is still a strm file: try get info from filename

    return _extractMediaData(media);

  }


  return data

}

function _extractMediaData(media) {

  // let videoRes = media.videoResolution;
  // let audioCh = media.audioChannels;

  // let filename = media.Part && media.Part[0].file;

  filename = media.Name

  let lastIndex = filename.lastIndexOf('-');
  let details = filename.substring(lastIndex + 1).trim();

  // if (details.lastIndexOf('.') > -1) {
  //   details = details.substring(0, details.lastIndexOf('.') );
  // }
  details = details.split(' ');

  // 1080p x265 AC3 5.1 9.3GB.mkv
  // 2160p h265 HDR AC3 2ch 72,76 G

  // remove size
  const unit = details.pop();
  if ( unit == 'G'){
    // remove size
    details.pop();
  }

  let audioCh, videoRes;

  try {
    audioCh = parseFloat(details.pop()).toFixed(1);

    videoRes = details.shift();
    if ( isNaN( Number(videoRes.charAt(0) ) )  ) {
      videoRes = details.shift();
    }

  } catch(e) {
    console.error(`[Template] cannot extract mediadata from ${filename} - ${e.message}` );
  }

  return {videoRes: [videoRes], audioCh: [audioCh]};
}


module.exports = {GetUserRequest, GetPoster, Labels, IMDB_RatingKey, extractMediaData}
