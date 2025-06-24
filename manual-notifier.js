const {Config} = require('./utils');
const {EmbyQuery, EmbyLibrary, EmbyRawQuery} = require('./emby');
const Readline = require('readline');
const Job = require('./job');
const Templates = require('./templates/index');
const TelegramBot = require('./telegram-bot');


const Libraries = Config.ConfigFile.Libraries || {};

let text = process.argv[2];
let resolution = process.argv[3];

if ( !text || !resolution ) {
  console.log('Missing data: search-text or resolution');
  return;
}

console.log('Searching for: ->', text, '<-');

async function start() {
  // let res = await EmbyQuery('/Views');
  // // res = JSON.parse(res.body);
  // console.log(`got directories: ${res.Items.length}`);


  // let directories = res.Items.filter( (dir) => {
  //   if ( Config.EMBY_LIBRARY.indexOf(dir.Name) <= -1 ) {
  //     console.log(`[WARN] Library [${dir.Name} - ${dir.Id}] has been marked for skip`);
  //     return false;
  //   } else {
  //     console.log(`[INFO] Library [${dir.Name} - ${dir.Id}] will be processed`);
  //   }
  //   return true;
  // });


  const params = [
    `SearchTerm=${text}`,
    'IncludeItemTypes=Movie,Series',
    'Recursive=true',
    // 'GroupProgramsBySeries=true',
    'Fields=PrimaryImageAspectRatio,ProductionYear,ParentId,Path'
  ]
  const searchResult = await EmbyQuery('/Items', params.join('&'));


  if ( searchResult.Items.length <= 0 ) {
    console.log('No result found for:', text);
    return;
  }

  async function gotSingleResultItem() {

    if ( searchResult.Items.length === 1 ) {
      return searchResult.Items[0];
    }

    if ( searchResult.Items.length > 1 ) {

      const sections = {};
      for (const [index, result] of searchResult.Items.entries() ) {
        const section = sections[ result.Type ] || [];
        section.push(  `(${index + 1}) - ${result.Name} (${result.ProductionYear})` );
        sections[ result.Type ] = section;
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

      // return searchResult.Items[0];

      return await new Promise((resolve, reject) => {
        rl.question('Choose item number or press CTRL+C to kill programm:  ', (number) => {

          rl.close();

          number = parseInt(number, 10); // - 1;
          if ( number && !isNaN(number) ) {
            if ( number < searchResult.Items.length ) {
              return resolve(searchResult.Items[number - 1]);
            }
          }
          console.log(`You entered '${number}', but seems to be invalid. Exit` );
          return reject();
        });
      });

    }

  }

  const item = await gotSingleResultItem();

  if ( !item ) {
    console.log('cannot get the item, exit');
    return;
  }



  // async function getLibrary(it) {
  //   let currentItem = it;
  //   let foundLibrary = null;

  //   // Cerca nella gerarchia fino a trovare la libreria
  //   while (currentItem) {
  //     const matchingLibrary = directories.find(lib => lib.Id === currentItem.ParentId);

  //     if (matchingLibrary) {
  //         foundLibrary = matchingLibrary;
  //         break; // Trovata la libreria di appartenenza
  //     }

  //     // Se non è una libreria, cerca l'elemento padre
  //     if (currentItem.ParentId) {
  //         currentItem = await EmbyQuery(`/Items/${currentItem.ParentId}`);
  //     } else {
  //         currentItem = null; // Nessun ParentId, abbiamo raggiunto la radice o un elemento orfano
  //     }
  //   }

  //   return foundLibrary;
  // }

  // const dir = await getLibrary(item);
  // if ( !dir ) {
  //   console.log('cannot found parent library');
  //   return;
  // }


  // let lib = Libraries[ dir.Name ];

  // lib.title = dir.Name;
  // lib.key = dir.Id;
  // lib.type = dir.CollectionType;

  // console.log('Starting for ->', item.Name, `(${item.ProductionYear})`, '<- in', dir.Name );

  // lib._manual = true;

  // const klassLib = new EmbyLibrary(lib);

  // let job = new Job( klassLib );

  // return job.executeScrapeAndNotify( [item] );


  try {
    console.log(`try to notify - '${item.Name}'`);
    const template = await Templates.template_new_version(item, resolution);

    if ( TelegramBot.Enabled ) {
      await TelegramBot.publish( template.poster, template.html );
    } else {
      console.log( template.html );
    }

  } catch( e ) {
    console.log(`[ERROR pug] ${e.message}`, e);
    if ( TelegramBot.Enabled ) {
      TelegramBot.sendError( `Pug notify_update - ${item.Name}`, e.stack);
    }
  }

}

start();

// PlexQuery('/library/sections').then( (results) => {
//   console.log(`got directories: ${results.MediaContainer.Directory.length}`);

//   let directories = results.MediaContainer.Directory;

//   return directories;


// }).then( (directories) => {


//   return PlexQuery(`/search?query=${text}`).then( (results) => {

//     if ( ! results.MediaContainer.Metadata ||  !Array.isArray(results.MediaContainer.Metadata) ) {
//       console.warn('No valid response from Plex' );
//       console.log(JSON.stringify(result));
//       return;
//     }


//     let items = results.MediaContainer.Metadata;

//     if ( items.length <= 0 ) {
//       console.log('!! 0 RESULTS !!');
//       return;

//     } else if ( items.length == 1 ) {

//       return {directories, items};

//     }

//     // found more than 1 results:

//     let sections = {};

//     for ( let i = 0, item; item = items[ i ]; i++ ) {

//       let sect = sections[ item.librarySectionTitle ];
//       if ( !sect ) {
//         sect = sections[ item.librarySectionTitle ] = [];
//       }
//       sect.push([ i + 1, `${item.title} (${item.year})` ].join( ' - ' ) );

//     }




// }).then( ({directories, items}) => {

//   if ( items.length == 0 ) {
//     throw new Error('No items found');
//   } else if ( items.length > 1 ) {
//     throw new Error('Found more than 1 item. Skip!');
//   }

//   let item = items[0];

//   return {directories, item};

// }).then( ({directories, item}) => {

//   let dir = directories.find((d) => d.key == item.librarySectionID);
//   let lib = Libraries[ dir.title ];

//   lib.title = dir.title;
//   lib.key = dir.key;
//   lib.type = dir.type;
//   // lib.jobschedule = Config.CRON;

//   return {lib, item};

// }).then( ({lib, item}) => {

//   console.log('Starting for ->', item.title, `(${item.year})`, '<- in', item.librarySectionTitle );

//   lib._manual = true;

//   let job = new Job( lib );

//   return job.executeScrapeAndNotify( [item] );

// }).then( () => {

//   console.log('completed!');
// })
