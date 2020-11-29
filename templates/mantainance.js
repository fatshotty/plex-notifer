const Path = require('path');
const {Config} = require('../utils');
const {PlexQuery} = require('../plex');
const FS = require('fs');



module.exports.mounted = function() {


  str = `📣 Manutenzione terminata 📣

Siamo tornati online
Buona visione  🌹
`;

  return str;


};

module.exports.unmounted = function() {


  str = `⚠️ Manutenzione ⚠️

👷 Stiamo lavorando per voi 👷`;

  return str;

};
