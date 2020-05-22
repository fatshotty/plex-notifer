const Entity = require('./entity');
const Moment = require('moment');

class TvShow extends Entity {

  get IsMovie() { return false; }
  get IsTvShow() { return true; }


  get ImdbId() {
    return this.data.imdbId;
  }

  get OriginalTitle() {
    return this.ImdbData ? this.ImdbData.title : null;
  }

  get Creators() {
    return []
  }

  get FirstDate() {
    return this.data.firstAirDate;
  }

  get LastDate() {
    return this.data.lastAirDate;
  }

  get DateRange() {
    let f = Moment(this.FirstDate, 'YYYY-MM-DD');
    let l = Moment(this.LastDate, 'YYYY-MM-DD');
    return `${f.year()} - ${l.year()}`;
  }

  get Homepage() {
    return this.ImdbData ? this.ImdbData.imdburl : null;
  }

  get Cast() {
    return this.ImdbData && this.ImdbData.actors ? this.ImdbData.actors.split(',').map( a => a.trim() ) : []
  }

  get Directors() {
    return this.ImdbData && this.ImdbData.director != "N/A" ? [this.ImdbData.director] : []
  }

  get Writers() {
    return this.ImdbData && this.ImdbData.writer != "N/A" ? [this.ImdbData.writer] : []
  }

  get Backdrop() {
    if ( this.config ) {
      return super.Backdrop
    }
    return this.data.backdropPath ? `https://artworks.thetvdb.com/banners/${this.data.backdropPath}` : undefined;
  }

  get Poster() {
    if ( this.config ) {
      return super.Poster
    }
    return this.data.posterPath ? `https://artworks.thetvdb.com/banners/${this.data.posterPath}` : undefined;
  }

  get NumberEpisodes() {
    return this.data.numberOfEpisodes;
  }

  get NumberSeasons() {
    return this.data.numberOfSeasons;
  }

  get Seasons() {
    return this._seasons;
  }

  constructor(data, config) {
    super(data, config);

    this._seasons = [];

    if ( this.data.seasons && Array.isArray( this.data.seasons ) ) {
      this._seasons = this.data.seasons.map( ep => new Season( ep, config ) );
    }

  }

  toPage() {
    let res = super.toPage();
    res.OriginalTitle = this.OriginalTitle;
    res.ImdbId = this.ImdbId
    res.Creators = this.Creators;
    res.FirstDate = this.FirstDate;
    res.LastDate = this.LastDate;
    res.DateRange = this.DateRange;
    res.NumberEpisodes = this.NumberEpisodes;
    res.NumberSeasons = this.NumberSeasons;
    res.Seasons = this.Seasons.map( s => s.toPage() );
    res.tvshow = true;
    res.movie = false;
    res.season = false;
    res.episode = false;
    return res;
  }

}

class Season extends Entity {

  constructor(data, config) {
    super(data, config);
    this._episodes = [];

    if ( this.data.episodes && Array.isArray( this.data.episodes ) ) {
      this._episodes = this.data.episodes.map( ep => new Episode( ep, config ) );
    }
  }

  get Genres() {
    return undefined;
  }

  get AirDate() {
    return this.data.airDate;
  }

  get Episodes() {
    return this._episodes;
  }

  get Number() {
    return this.data.seasonNumber;
  }

  get Cast() {
    return [];
  }

  get Directors() {
    return []
  }

  get Writers() {
    return []
  }

  get Backdrop() {
    if ( this.config ) {
      return super.Backdrop
    }
    return this.data.backdropPath ? `https://artworks.thetvdb.com/banners/${this.data.backdropPath}` : undefined;
  }

  get Poster() {
    if ( this.config ) {
      return super.Poster
    }
    return this.data.posterPath ? `https://artworks.thetvdb.com/banners/${this.data.posterPath}` : undefined;
  }

  toPage() {
    let res = super.toPage();
    res.AirDate = this.AirDate;
    res.Episodes = this.Episodes.map( e => e.toPage() );
    res.Number = this.Number;
    res.season = true;
    res.episode = false;
    res.tvshow = false;
    res.movie = false;
    return res;
  }

}


class Episode extends Entity {

  constructor(data, config) {
    super(data, config);
    this._crew = [];
    this.data.credits = { crew: this.data.crew };
    delete this.data.crew;
  }

  get Genres() {
    return undefined;
  }

  get AirDate() {
    return this.data.airDate;
  }

  get Number() {
    return this.data.episodeNumber;
  }

  get ProductionCode() {
    return this.data.productionCode;
  }

  get Guests() {
    return (this.data.guestStars || []).map( g => g.name );
  }

  get Cast() {
    return [];
  }

  get Directors() {
    return []
  }

  get Writers() {
    return []
  }

  get Backdrop() {
    if ( this.config ) {
      return super.Backdrop
    }
    return this.data.backdropPath ? `https://artworks.thetvdb.com/banners/${this.data.backdropPath}` : undefined;
  }

  get Poster() {
    if ( this.config ) {
      return super.Poster
    }
    return this.data.posterPath ? `https://artworks.thetvdb.com/banners/${this.data.posterPath}` : undefined;
  }

  toPage() {
    let res = super.toPage();
    res.AirDate = this.AirDate;
    res.ProductionCode = this.ProductionCode;
    res.VoteAverage = this.VoteAverage;
    res.VoteCount = this.VoteCount;
    res.Number = this.Number;
    res.season = false;
    res.episode = true;
    res.tvshow = false;
    res.movie = false;
    return res;
  }
}



module.exports = TvShow;
