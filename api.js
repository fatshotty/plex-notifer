const HTTP = require('http');
const {Config} = require('./utils');

const HOSTNAME = Config.DB_HOST;
const PORT = Config.DB_PORT;
const API_KEY = Config.CATALOG_API_KEY;
const AUTH = 'system:syst3m';

const CATALOG_UUID =Config.CATALOG_UUID;
const USER_UUID =Config.CATALOG_USER_UUID;


function searchEntity(ENTTITY_TYPE, title, year, tmdb) {

  let key = `search by`;

  let query = ['a=1'];
  if ( !tmdb ) {
    query.push(`f[Name]=${encodeURIComponent(title)}`);
    query.push(`f[Year]=${year}`);
    key = `search by ${title} - ${year}`;
  } else {
    query.push(`f[TmdbId]=${encodeURIComponent(tmdb)}`);
    key = `search by ${title} - ${year} - ${tmdb}`;
  }


  return new Promise( (resolve, reject) => {
    const options = {
      hostname: HOSTNAME,
      port: PORT,
      auth: AUTH,
      path: `/u/${USER_UUID}/c/${CATALOG_UUID}/${ENTTITY_TYPE}/search?${query.join('&')}`,
      method: 'GET'
    };

    let req = HTTP.request(options, (res) => {
      res.setEncoding('utf-8');

      let cb = resolve;

      if ( res.statusCode >= 200 && res.statusCode < 300 ) {
        console.log('\t',key, `ok`);
      } else {
        console.error('\t',key, `XXX:     ${res.statusCode}`);
        cb = reject;
      }

      let data = [];

      res.on('data', (chunk) => {
        data.push(chunk);
      });
      res.on('end', () => {
        process.nextTick( () => {
          cb( data.join('') );
        });
      });
    });

    req.on('error', (e) => {
      console.error('\t',`problem with request: ${e.message}`);
      process.nextTick( reject );
    });

    // req.write(postData);
    req.end();
  });

}



function createEntity(ENTTITY_TYPE, key, postData) {

  return new Promise( (resolve, reject) => {
    const options = {
      hostname: HOSTNAME,
      port: PORT,
      auth: AUTH,
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      },
      path: `/manager/catalogs/${CATALOG_UUID}/${ENTTITY_TYPE}`,
      method: 'POST'
    };

    let req = HTTP.request(options, (res) => {
      res.setEncoding('utf-8');

      let cb = resolve;

      if ( res.statusCode >= 200 && res.statusCode < 300 ) {
        console.log('\t',key, `ok`);
      } else {
        console.error('\t',key, `XXX:     ${res.statusCode}`);
        cb = reject;
      }

      let data = [];

      res.on('data', (chunk) => {
        data.push(chunk);
      });
      res.on('end', () => {
        process.nextTick( () => {
          cb( data.join('') );
        });
      });
    });

    req.on('error', (e) => {
      console.error('\t',`problem with request: ${e.message}`);
      process.nextTick( reject );
    });

    req.write(postData);
    req.end();
  });
}


function createMediaFile(ENTTITY_TYPE, ENTRY_UUID, SEASON_ID, EPISODE_ID, key, postData) {
  return new Promise( (resolve, reject) => {

    let path = `/manager/catalogs/${CATALOG_UUID}/${ENTTITY_TYPE}/${ENTRY_UUID}`;
    if ( SEASON_ID && EPISODE_ID ) {
      path += `/seasons/${SEASON_ID}/episodes/${EPISODE_ID}`
    }

    path = `${path}/mediafiles`;

    const options = {
      hostname: HOSTNAME,
      port: PORT,
      auth: AUTH,
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      },
      path: path,
      method: 'POST'
    };

    let req = HTTP.request(options, (res) => {
      res.setEncoding('utf-8');

      let cb = resolve;

      if ( res.statusCode >= 200 && res.statusCode < 300 ) {
        console.log('\t',key, `ok`);
      } else {
        console.error('\t',key, `XXX:     ${res.statusCode} - ${path}`);
        cb = reject;
      }

      let data = [];

      res.on('data', (chunk) => {
        data.push(chunk);
      });
      res.on('end', () => {
        process.nextTick( () => {
          cb( data.join('') );
        });
      });
    });

    req.on('error', (e) => {
      console.error('\t',`problem with request: ${e.message}`);
      process.nextTick( reject );
    });

    req.write(postData);
    req.end();
  });
}


function createSeason(ENTTITY_TYPE, ENTRY_UUID, key, postData) {
  return new Promise( (resolve, reject) => {
    const options = {
      hostname: HOSTNAME,
      port: PORT,
      auth: AUTH,
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      },
      path: `/manager/catalogs/${CATALOG_UUID}/${ENTTITY_TYPE}/${ENTRY_UUID}/seasons`,
      method: 'POST'
    };

    let req = HTTP.request(options, (res) => {
      res.setEncoding('utf-8');

      let cb = resolve;

      if ( res.statusCode >= 200 && res.statusCode < 300 ) {
        console.log('\t',key, `ok`);
      } else {
        console.error('\t',key, `XXX:     ${res.statusCode}`);
        cb = reject;
      }

      let data = [];

      res.on('data', (chunk) => {
        data.push(chunk);
      });
      res.on('end', () => {
        process.nextTick( () => {
          cb( data.join('') );
        });
      });
    });

    req.on('error', (e) => {
      console.error('\t',`problem with request: ${e.message}`);
      process.nextTick( reject );
    });

    req.write(postData);
    req.end();
  });
}


function createEpisode(ENTTITY_TYPE, ENTRY_UUID, SEASON_ID, key, postData) {
  return new Promise( (resolve, reject) => {
    const options = {
      hostname: HOSTNAME,
      port: PORT,
      auth: AUTH,
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      },
      path: `/manager/catalogs/${CATALOG_UUID}/${ENTTITY_TYPE}/${ENTRY_UUID}/seasons/${SEASON_ID}/episodes`,
      method: 'POST'
    };

    let req = HTTP.request(options, (res) => {
      res.setEncoding('utf-8');

      let cb = resolve;

      if ( res.statusCode >= 200 && res.statusCode < 300 ) {
        console.log('\t',key, `ok`);
      } else {
        console.error('\t',key, `XXX:     ${res.statusCode}`);
        cb = reject;
      }

      let data = [];

      res.on('data', (chunk) => {
        data.push(chunk);
      });
      res.on('end', () => {
        process.nextTick( () => {
          cb( data.join('') );
        });
      });
    });

    req.on('error', (e) => {
      console.error('\t',`problem with request: ${e.message}`);
      process.nextTick( reject );
    });

    req.write(postData);
    req.end();
  });
}

module.exports = {searchEntity, createEntity,
createMediaFile,
createSeason,
createEpisode};
