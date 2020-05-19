const Entity = require('./entity');
const Moment = require('moment');
class Movie extends Entity {

  get IsMovie() { return true; }
  get IsTvShow() { return false; }

  get ImdbId() {
    return this.data.imdbId;
  }

  get Title() {
    return this.data.title;
  }

  get Collection() {
    let collection = this.data.belongsToCollection ? this.data.belongsToCollection.name : null;
    if ( collection ) {
      let i_collection = collection.lastIndexOf('-');
      collection = collection.substring(0, i_collection);
      return collection.trim();
    }
    return '';
  }

  get OriginalTitle() {
    return this.data.originalTitle;
  }

  get ReleaseDate() {
    return this.data.releaseDate;
  }

  get DateRange() {
    let f = Moment(this.ReleaseDate, 'YYYY-MM-DD');
    return f.year()
  }

  get Tag() {
    return this.data.tagline;
  }

  // VIDEOS

  get YT_trailer() {
    if ( this.data.videos ) {
      if ( this.data.videos.results && this.data.videos.results.length ) {
        let videos = this.data.videos.results;
        let trailer = videos.filter(v => v.site == 'YouTube' && v.type == 'Trailer' );
        if ( trailer && trailer[0] ) {
          return `${trailer[0].key}`
        }
      }
    }
    return '';
  }


  constructor(data, config) {
    super(data, config);
  }


  toPage() {
    let res = super.toPage();
    res.Collection = this.Collection;
    res.ImdbId = this.ImdbId;
    res.OriginalTitle = this.OriginalTitle;
    res.ReleaseDate = this.ReleaseDate;
    res.DateRange = this.DateRange;
    res.Tag = this.Tag;
    res.YT_trailer = this.YT_trailer;
    res.tvshow = false;
    res.movie = true;
    res.season = false;
    res.episode = false;
    return res;
  }

}


module.exports = Movie;
