const FS = require('fs');
const Path = require('path');
const Glob = require('glob')


const FOLDER = process.argv[2]

if ( !FOLDER ) {
  console.log('need folder specified');
  process.exit(1);
}


async function loopFolder(fld) {

  console.log('reading dir', fld);

  const folders = FS.readdirSync(fld);

  console.log('read', folders.length, 'items');

  for ( const [i, folder] of folders.entries() ) {

    const perc = parseInt(i * 100 / folders.length, 10);

    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write( `${perc}% | ${folder}` );

    const fullpath = Path.join(fld, folder);
    const stat = FS.statSync( fullpath );

    if ( stat.isDirectory() ) {

      const requestedFiles = Glob.globSync(['*.nfo', '*fanart.{png,jpeg,jpg}', '*poster.{png,jpeg,jpg}'], {cwd: fullpath});

      let tot = 0;

      for ( const file of requestedFiles ) {
        // const filepath = Path.join(fullpath, file);
        const ext = Path.extname( file );

        for ( const reqExt of ['.nfo', '.jpg', '.png', '.jpeg']) {
          if ( ext == reqExt ) {
            tot++;
            break;
          }
        }

      }

      if ( tot < 3 ) {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        console.log( `"${folder}"` , 'could be missing required files:', requestedFiles);
      }


    }
  }
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  console.log('');
}


loopFolder(FOLDER);
