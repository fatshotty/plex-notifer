const Scraper = require('./scraper/scraper');
const TVDB = Scraper.TVDB;


TVDB.getInfo('372996', 'tv').then( (klass) => {
    resolve( {scraped: klass, plexItem} );
}).catch( (err) => {
console.error( `${this.JobName} - ${title} (${year}) - error during 'getInfo' - ${err.message}` );
return resolve( {scraped: null, plexItem} );
});