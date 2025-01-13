
console.log(`****** STARTING UP ${new Date().toISOString()} ******`);

const {Config, saveConfig, Trakt} = require('./utils');
const {PlexQuery} = require('./plex');
const {EmbyQuery, EmbyLibrary} = require('./emby');
const Job = require('./job');
const Path = require('path');
const FS = require('fs');


const HealtCheckJob = require('./health-check');


const HealtCheck = new HealtCheckJob({
  jobschedule: Config.HEALT_CHECK_CRON
});



let _console_log = console.log;

console.log = function() {
  let args = Array.prototype.slice.call(arguments, 0);
  args.unshift( `(${new Date().toISOString()}) -`);
  _console_log.apply(console, args);
};



let datafolder = Config.DATAFOLDER
if ( ! FS.existsSync(datafolder) ) {
  FS.mkdirSync( datafolder );
}




if ( Config.ENABLE_WEBHOOK ) {
  require('./webhook/webhook');
}


let libraries = Config.ConfigFile.Libraries || {};


let jobs = [];

async function loginTrakt() {

  if ( FS.existsSync(Config.TraktTokenFile) ) {
    let tokensraw = FS.readFileSync( Config.TraktTokenFile, {encoding: 'utf-8'});
    if ( tokensraw ) {
      try {
        let tokens = JSON.parse(tokensraw);
        tokens = await Trakt.login(tokens);
        FS.writeFileSync( Config.TraktTokenFile, JSON.stringify(tokens, null, 2), 'utf-8');
      } catch(e) {
        Log.warn('Trakt tokens are not valid');
      }
    }
  }
}


async function executeLoginTrakt() {
  console.log('Trakt login...');
  let codes = await Trakt.getCode();

  console.log('go to https://trakt.tv/activate and type this code:', codes.user_code);

  console.log('waiting for login...');

  let tokens = await Trakt.pollAuth(codes);

  FS.writeFileSync( Config.TraktTokenFile, JSON.stringify(tokens, null, 2), 'utf-8');

  console.log('login successfull!');
}


async function execTrakt() {

  await loginTrakt();

  if ( ! Trakt.LoggedIn ) {
    await executeLoginTrakt();
  }

  if ( ! Trakt.LoggedIn ) {
    throw "Trakt is not loggedin";
  }

}


async function startPlex() {

  PlexQuery('/library/sections').then( (results) => {
    console.log(`got directories: ${results.MediaContainer.Directory.length}`);

    let directories = results.MediaContainer.Directory;

    directories = directories.filter( (dir) => {
      if ( Config.PLEX_SKIP_LIBRARY.indexOf(dir.key) > -1 ) {
        console.log(`[WARN] Library [${dir.title} - ${dir.key}] has been marked for skip`);
        return false;
      }
      return true;
    })

    for ( let dir of directories ) {
      console.log(`Library [${dir.title} - ${dir.key}] will be processed`);

      let lib = libraries[ dir.title ];
      if ( !lib ) {
        lib = libraries[ dir.title ] = {lastScan: 0};
        console.log(`found new directory`);
      }

      lib.title = dir.title;
      lib.key = dir.key;
      lib.type = dir.type;
      lib.jobschedule = Config.CRON;

      let job = new Job( lib );

      job.on('gotitems', (items) => {
        let item = items.slice(0).pop();
        item = (item && item.plexItem) || item;
        if ( item ) {
          console.log(`${job.JobName} report scanned from ${lib.lastScan} to ${item.addedAt}`);
          lib.lastScan = item.addedAt;
          saveConfig();
        }
      });

      jobs.push( job );
    }


  }).then( () => {
    Config.ConfigFile.Libraries = libraries;
    // TODO: save preferences file
    saveConfig();

  }).then( () => {


    for ( let job of jobs ) {
      job.start();
    }

    HealtCheck.start();

  });
}


async function startEmby() {

  const res = await EmbyQuery('/Items');
  console.log(`got directories: ${res.Items.length}`);


  let directories = res.Items.filter( (dir) => {
    if ( Config.EMBY_LIBRARY.indexOf(dir.Name) <= -1 ) {
      console.log(`[WARN] Library [${dir.Name} - ${dir.Id}] has been marked for skip`);
      return false;
    } else {
      console.log(`[INFO] Library [${dir.Name} - ${dir.Id}] will be processed`);
    }
    return true;
  });

  for ( let dir of directories ) {
    console.log(`Library ['${dir.Name}' - ${dir.Id}] will be processed`);

    let lib = libraries[ dir.Name ];
    if ( !lib ) {
      lib = libraries[ dir.Name ] = {lastScan: 0};
      console.log(`found new directory`);
    }

    lib.title = dir.Name;
    lib.key = dir.Id;
    lib.type = dir.CollectionType;
    lib.jobschedule = Config.CRON;


    const klassLib = new EmbyLibrary(lib);

    let job = new Job( klassLib );

    job.on('gotitems', (items) => {
      let item = items[ items.length - 1 ];
      item = (item && item.embyItem) || item;
      if ( item ) {
        console.log(`${job.JobName} report scanned from ${lib.lastScan} to ${item.DateUpdated}`);
        lib.lastScan = item.DateUpdated;
        saveConfig();
      }
    });

    jobs.push( job );
  }

  Config.ConfigFile.Libraries = libraries;

  // TODO: save preferences file
  saveConfig();

  for ( let job of jobs ) {
    job.start();
  }

  HealtCheck.start();
}


async function StartApplication() {
  // await execTrakt();
  // await startPlex();
  await startEmby();
}

StartApplication()
