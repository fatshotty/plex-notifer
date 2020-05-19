
class Entity {

  get IsMovie() { return false; }
  get IsTvShow() { return false; }

  get Id() {
    return this.data.id;
  }

  get Title() {
    return this.data.name;
  }

  get ImdbData() {
    return this.data.imdb_data;
  }

  get Homepage() {
    return this.data.homepage
  }

  get Description() {
    return this.data.overview;
  }

  get Genres() {
    return (this.data.genres || []).map( g => g.name );
  }

  get Cast() {
    let cast = (this.data.credits.cast || []).sort( (c1, c2) => {return c1.order > c2.order ? 1 : -1} )
    return cast.map( c => c.name );
  }

  get Directors() {
    return (this.data.credits.crew || []).filter(c => c.job == "Director").map( c => c.name );
  }

  get Writers() {
    return (this.data.credits.crew || []).filter(c => c.department == "Writing").map( c => c.name );
  }

  get Vote() {
    return this.data.voteAverage;
  }

  // IMAGES

  get Backdrop() {
    return this.data.backdropPath ? `${this.config.images.secureBaseUrl}original${this.data.backdropPath}` : undefined;
  }

  get Poster() {
    return this.data.posterPath ? `${this.config.images.secureBaseUrl}original${this.data.posterPath}` : undefined;
  }

  get Backdrops() {
    if ( ! this.data.backdropPath ) return undefined;
    let res = {};
    this.config.images.backdropSizes.forEach( (bs) => {
      res[ bs ] = `${this.config.images.secureBaseUrl}${bs}${this.data.backdropPath}`;
    })
    return res;
  }

  get Posters() {
    if ( ! this.data.posterPath ) return undefined;
    let res = {};
    this.config.images.posterSizes.forEach( (ps) => {
      res[ ps ] = `${this.config.images.secureBaseUrl}${ps}${this.data.posterPath}`;
    })
    return res;
  }


  constructor(data, config) {
    this.data = data;
    this.config = config;
  }


  toPage() {
    let res = {
      Title: this.Title,
      Id: this.Id,
      ImdbData: this.ImdbData,
      Homepage: this.Homepage,
      Description: this.Description,
      Genres: this.Genres,
      Cast: this.Cast,
      Directors: this.Directors,
      Writers: this.Writers,
      Vote: this.Vote,
      Backdrop: this.Backdrop,
      Poster: this.Poster,
      tvshow: false,
      movie: false
    };

    for ( let [k, v] of Object.entries(res) ) {
      if ( v === undefined ){
        delete res[ k ];
      }
    }

    return res;

  }

}

module.exports = Entity;
