const Request = require('../webhook/models/Request')
const Got = require('got');
const FS = require('fs');
const {PlexQuery} = require('../plex');
const Util = require('util');
const Stream = require('stream');


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


async function GetPoster({scraped, plexItem}, {Name}) {

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



module.exports = {GetUserRequest, GetPoster}
