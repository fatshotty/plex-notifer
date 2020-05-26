
console.log(`****** STARTING UP ${Date.now()} ******`);

const {Config, saveConfig} = require('./utils');
const {PlexQuery} = require('./plex');
const Job = require('./job');


let libraries = Config.ConfigFile.Libraries || {};


let jobs = [];


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
      if ( item ) {
        console.log(`${job.JobName} report scanned from ${lib.lastScan} to ${item.addedAt}`);
        // lib.lastScan = item.addedAt;
      }
    });

    job.on('completed', function() {
      saveConfig();
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

});
