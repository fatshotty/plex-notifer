const { GetPoster }  = require('./template_utils');
const { Config } = require('../utils');


module.exports = async function(item, resolution) {

  let p_poster = GetPoster(item, {Name: 'new_version'});


  let str = [
    `🏅 <b>Aggiornamento versione!</b> 🏅`,
    `🎬 <b>${item.Name}</b>`,
    '',
    resolution ? `<b>Risoluzione:</b> ${resolution}` : 'NO',
    '',
    Config.PC_NAME ? `- ${Config.PC_NAME} -` : 'NO'
  ];


  return p_poster.then( (poster) => {
    return Promise.resolve( {
      poster,
      html: str.filter(row => row != 'NO').join('\n'),
    });
  });
};