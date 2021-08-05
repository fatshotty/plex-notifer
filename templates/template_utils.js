const Request = require('../webhook/models/Request')



module.exports = function(tmdbID, title, year) {

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
