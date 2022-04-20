const {EventEmitter} = require('events');
const TraktTv = require('trakt.tv');
const GOT = require('got');


const DayJs = require('dayjs');

const PROTOCOL = 'https';
const DOMAIN = 'trakt.tv';

class Trakt extends EventEmitter {

  static Type = {Show: 'shows', Movie: 'movies'};

  _loggedIn = false;
  user = null;

  constructor({client_id, client_secret}) {
    super();

    if ( !client_id || !client_secret ) {
      throw new Error('no client_id or client_secret for Trakt');
    }

    this.appconfig = {
      client_id: client_id,
      client_secret: client_secret
    };

    this._loggedIn = false;

    this._trakt = new TraktTv(this.appconfig);
    this._service = this._trakt
  }


  get LoggedIn() {
    return this._loggedIn;
  }

  get User() {
    return {
      username: this.user.user.username,
      name: this.user.user.name,
      vip: this.user.user.vip,
      avatar: this.user.user.images && this.user.user.images.avatar && this.user.user.images.avatar.full ? this.user.user.images.avatar.full : '',
      slug: this.user.user.ids.slug,
      uuid: this.user.user.ids.uuid
    };
  }


  async login(tokens) {
    let newtokens = await this._trakt.import_token(tokens);
    await this.getUserSettings();
    this._loggedIn = true;
    return newtokens;
  }

  async getCode() {
    return await this._trakt.get_codes();
  }

  async pollAuth(poll) {
    let success = await this._trakt.poll_access(poll);
    if ( success ) {
      this._loggedIn = true;
      await this.getUserSettings();
      return this._trakt.export_token();
    }
    throw new Error('login fail');
  }

  logout() {
    this._trakt.revoke_token();
    this.user = null;
    this._loggedIn = false;
  }

  async clearCache() {
    return this._service.clear();
  }

  async newLoginProcess() {
    let poll = await this.getCode();

    let prom = this.pollAuth(poll);

    return { fn: prom, codes: poll };
  }


  async getUserSettings() {
    this.user = await this._trakt.users.settings()
    return this.user;
  }


  async getMyShowsNews(start, days) {
    let mytvshows = await this._service.calendars.my.shows({start_date: start, days: days});

    let tvshows = {};

    for ( let data of mytvshows ) {
      let showid = data.show.ids && data.show.ids.trakt;
      if ( showid ) {
        let tv = tvshows[ String(showid) ]
        if ( !tv ) {
          tv = new TvShow();
          tv.Title = data.show.title;
          tv.Year = data.show.year;
          tv.Slug = data.show.ids && data.show.ids.slug;
          tv.Trakt_id = data.show.ids && String(data.show.ids.trakt);
          tv.Imdb_id = data.show.ids && String(data.show.ids.imdb);
          tv.Tmdb_id = data.show.ids && String(data.show.ids.tmdb);
          tv.Tvdb_id = data.show.ids && String(data.show.ids.tvdb);

          tvshows[ String(showid) ] = tv;
        }
        tv.addEpisode( data.episode.season, data.episode.number, {released: DayJs(data.first_aired).unix()} )
      }
    }
    
    let results = Object.values(tvshows);

    for ( let tv of results ) {
      let episodes = tv.Episodes;


      episodes.sort( (e1, e2) => {
        if ( e1.Season > e2.Season ) {
          return 1
        }
        if ( e1.Episode > e2.Episode ) {
          return 1;
        }

        return -1;
      })

    }

    return results;
  }

  async getMyMoviesNews(start, days) {
    let mymovies = await this._service.calendars.my.movies({start_date: start, days: days});

    return this.remapMovie(mymovies);
  }

  async getMovieByID(id) {
    let movie = await this._service.movies.summary({id: id, extended: 'full'});

    return movie
  }

  async getTvShowByID(id) {
    let movie = await this._service.shows.summary({id: id, extended: 'full'});

    return movie
  }


  remapMovie(mymovies) {
    let results = mymovies.map( (data) => {
      let m = new Movie();

      m[ Movie.Fields.TraktID ]   =  data.movie.ids && String(data.movie.ids.trakt);
      m[ Movie.Fields.Released ] = DayJs(data.movie.released).unix();
      m[ Movie.Fields.Title ]   =  data.movie.title;
      m[ Movie.Fields.Year ]   = data.movie.year;
      m[ Movie.Fields.TvdbID ] = '';
      m[ Movie.Fields.ImdbID ] = data.movie.ids && String(data.movie.ids.imdb);
      m[ Movie.Fields.TmdbID ] = data.movie.ids && String(data.movie.ids.tmdb);
      m[ Movie.Fields.Slug ]   = data.movie.ids && data.movie.ids.slug;
      // m[ Movie.Fields.Checked ] = false;
      // m[ Movie.Fields.Notified ] = false;
      // m[ Movie.Fields.Countries ] = [];
      m[ Movie.Fields.Rating ] = data.movie.rating || 0;
      m[ Movie.Fields.Genres ] = data.movie.genres || [];
      m[ Movie.Fields.Certification ] = data.movie.certification;
      m[ Movie.Fields.Trailer ] = data.movie.trailer;
      m[ Movie.Fields.Homepage ] = data.movie.homepage;
      m[ Movie.Fields.Status ] = data.movie.status;

      m[ Movie.Fields.Country ] = data.movie.country;


      if ( !m.ReleaseDate || !m.Title || !m.Year || !m.TraktID ) {
        console.error('cannot remap movie because missing required data:', `[${m.TraktID}] ${m.Title} (${m.Year}) - ${m.ReleaseDate}`);
        return undefined;
      }


      return m;
    }).filter(Boolean);

    return results;
  }




  remapTvShows(tvshows) {

    let results = tvshows.map( (data) => {
      let t = new TvShow();

      t[ TvShow.Fields.TraktID ]   =  data.show.ids && String(data.show.ids.trakt);
      t[ TvShow.Fields.Released ] = DayJs(data.show.first_aired || 0).unix();
      t[ TvShow.Fields.Title ]   =  data.show.title;
      t[ TvShow.Fields.Year ]   = data.show.year;
      t[ TvShow.Fields.TvdbID ] = data.show.ids && String(data.show.ids.tvdb);
      t[ TvShow.Fields.ImdbID ] = data.show.ids && String(data.show.ids.imdb);
      t[ TvShow.Fields.TmdbID ] = data.show.ids && String(data.show.ids.tmdb);
      t[ TvShow.Fields.Slug ]   = data.show.ids && data.show.ids.slug;
      t[ TvShow.Fields.Rating ] = data.show.rating || 0;
      t[ TvShow.Fields.Genres ] = data.show.genres || [];
      t[ TvShow.Fields.Certification ] = data.show.certification;
      t[ TvShow.Fields.Trailer ] = data.show.trailer;
      t[ TvShow.Fields.Homepage ] = data.show.homepage;
      t[ TvShow.Fields.Status ] = data.show.status;
      t[ TvShow.Fields.Network ] = data.show.network;

      t[ Movie.Fields.Country ] = data.show.country;

      if ( data.seasons ) {
        const episodes = [];

        for ( let seas of data.seasons ) {
          let seas_number = seas.number;
          for ( let ep of seas.episodes ) {

            episodes.push({
              [Episode.Fields.Season]: seas_number,
              [Episode.Fields.Number]: ep.number
            });
          }
        }

        t.Episodes = episodes;
      }

      return  t;

    })


    return results;

  }



  async getImages(opts) {
    return await this._trakt.images.get(opts);
  }


  async getAllCustomLists() {
    let options = {};

    options.username = this.User.username;
    return await this._service.users.lists.get(options);
  }

  async getCustomList(name) {
    let options = {};
    options.id = name;

    options.username = this.User.username;
    return await this._service.users.list.get(options);
  }

  async createCustomList(name, options) {

    options = options || {};
    options.name = name;

    options.username = this.User.username;

    return await this._service.users.lists.create(options);

  }

  async insertItemsToList(slug, data) {
    let postdata = {
      username: this.User.username,
      id: slug,
      movies: data.movies,
      shows: data.shows
    }

    return await this._service.users.list.items.add(postdata);

  }


  static async request(path, country) {

    let url = `${PROTOCOL}://${DOMAIN}/${path}`;
    let headers = {};
    if ( country ) {
      headers.cookie = (headers.cookie || "") + `watchnow_country=${country};`
    }
    let res = await GOT(url, {headers: headers});
    return res.body;

  }

  static async checkReleases(type, slug, season, episode, country) {

    let path = [`${type}/${slug}`];
    if ( season ) {
      path.push(`seasons/${season}`)
    }
    if ( episode ) {
      path.push(`episodes/${episode}`)
    }

    let html = await Trakt.request( path.join('/'), country );

    let {window} = new JSDOM(html);
    let {document} = window;

    let watchNow = document.querySelector('a[data-target="#watch-now-modal"]');
    if ( watchNow ) {
      let services = watchNow.querySelector('.under-info.no-hide');
      let servicesText = services.textContent;

      let match = servicesText.match(/^(\d{1,})\s/ );
      if ( match && match.length > 1) {
        let servicesNum = Number( match[1] );
        if ( ! isNaN(servicesNum ) ) {
          return servicesNum;
        }
      }

    }
    return 0;
  }

}
module.exports = Trakt;
