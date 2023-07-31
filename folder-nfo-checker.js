const FS = require('fs');
const Path = require('path');
const Glob = require('glob')


const FOLDER = process.argv[2]

if ( !FOLDER ) {
  console.log('need folder specified');
  process.exit(1);
}


async function loopFolder(fld) {

  const folders = FS.readdirSync(fld);

  for ( const folder of folders ) {
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
        console.log( fullpath , 'could be missing required files:', requestedFiles);
      }


    }
  }
}


loopFolder(FOLDER);
