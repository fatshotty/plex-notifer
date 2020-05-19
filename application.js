const {Config, saveConfig} = require('./utils');
const {PlexQuery} = require('./plex');
const Job = require('./job');


let libraries = Config.ConfigFile.Libraries || {};


let jobs = [];


PlexQuery('/library/sections').then( (results) => {
  console.log(`got directories: ${results.MediaContainer.Directory.length}`);

  let directories = results.MediaContainer.Directory;

  for ( let dir of directories ) {
    if ( dir.key != 7 ) { continue; }
    if ( dir.title == 'Musica' ) continue;
    console.log(`found directory ${dir.key} - ${dir.title}`);

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
        lib.lastScan = item.addedAt;
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
