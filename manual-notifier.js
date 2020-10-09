const {Config} = require('./utils');
const {PlexQuery} = require('./plex');
const Readline = require('readline');
const Job = require('./job');


const Libraries = Config.ConfigFile.Libraries || {};


let text = process.argv.slice(2).join(' ');

console.log('Searching for: ->', text, '<-');


PlexQuery('/library/sections').then( (results) => {
  console.log(`got directories: ${results.MediaContainer.Directory.length}`);

  let directories = results.MediaContainer.Directory;

  return directories;


}).then( (directories) => {


  return PlexQuery(`/search?query=${text}`).then( (results) => {

    if ( ! results.MediaContainer.Metadata ||  !Array.isArray(results.MediaContainer.Metadata) ) {
      console.warn('No valid response from Plex' );
      console.log(JSON.stringify(result));
      return;
    }


    let items = results.MediaContainer.Metadata;

    if ( items.length <= 0 ) {
      console.log('!! 0 RESULTS !!');
      return;

    } else if ( items.length == 1 ) {

      return {directories, items};

    }

    // found more than 1 results:

    let sections = {};

    for ( let i = 0, item; item = items[ i ]; i++ ) {

      let sect = sections[ item.librarySectionTitle ];
      if ( !sect ) {
        sect = sections[ item.librarySectionTitle ] = [];
      }
      sect.push([ i + 1, `${item.title} (${item.year})` ].join( ' - ' ) );

    }

    console.log('');

    let keys = Object.keys(sections);
    for ( let key of keys ) {
      let arr = sections[ key ];
      console.log(`- ${key}:`);
      console.log(`${arr.join('\n')}`);
      console.log('');
    }

    const rl = Readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise( (resolve, reject) => {

      // return resolve( {directories, items: [ items[1 - 1] ]  } );

      rl.question('Choose item number or press CTRL+C to kill programm:  ', (number) => {

        rl.close();

        number = parseInt(number, 10) - 1;
        if ( number && !isNaN(number) ) {
          if ( number < items.length ) {
            return resolve( {directories, items: [ items[number] ]  } );
          }
        }
        reject(`You entered '${number}', but seems to be invalid. Exit` )
      });

    });


  })


}).then( ({directories, items}) => {

  if ( items.length == 0 ) {
    throw new Error('No items found');
  } else if ( items.length > 1 ) {
    throw new Error('Found more than 1 item. Skip!');
  }

  let item = items[0];

  return {directories, item};

}).then( ({directories, item}) => {

  let dir = directories.find((d) => d.key == item.librarySectionID);
  let lib = Libraries[ dir.title ];

  lib.title = dir.title;
  lib.key = dir.key;
  lib.type = dir.type;
  // lib.jobschedule = Config.CRON;

  return {lib, item};

}).then( ({lib, item}) => {

  console.log('Starting for ->', item.title, `(${item.year})`, '<- in', item.librarySectionTitle );

  lib._manual = true;

  let job = new Job( lib );

  return job.executeScrapeAndNotify( [item] );

}).then( () => {

  console.log('completed!');
  process.exit(0);
})
