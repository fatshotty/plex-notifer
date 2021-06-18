const DiskDB = require('diskdb')
const {Config} = require('../utils');
const DB = DiskDB.connect(Config.DATAFOLDER, ['requests']);



// {
//       "notification_type": "{{notification_type}}",
//       "mediatitle": "{{subject}}",
//       "plot": "{{message}}",
//       "poster": "{{image}}",
//       "email": "{{notifyuser_email}}",
//       "username": "{{notifyuser_username}}",
//       "avatar": "{{notifyuser_avatar}}",
//       "{{media}}": {
//           "media_type": "{{media_type}}",
//           "tmdbId": "{{media_tmdbid}}",
//           "imdbId": "{{media_imdbid}}",
//           "tvdbId": "{{media_tvdbid}}",
//           "status": "{{media_status}}",
//           "status4k": "{{media_status4k}}"
//       },
//       "{{extra}}": [],
//       "{{request}}": {
//           "request_id": "{{request_id}}",
//           "requestedBy_email": "{{requestedBy_email}}",
//           "requestedBy_username": "{{requestedBy_username}}",
//           "requestedBy_avatar": "{{requestedBy_avatar}}"
//       }
//   }



class Request {


  get Type() {
    return this.data.Type
  }

  set  Type(v) {
    this.data.Type = v;
  }

  get MediaTitle() {
    return this.data.MediaTitle
  }

  set  MediaTitle(v) {
    this.data.MediaTitle = v;
  }

  get Plot() {
    return this.data.Plot
  }

  set  Plot(v) {
    this.data.Plot = v;
  }

  get Poster() {
    return this.data.Poster
  }

  set  Poster(v) {
    this.data.Poster = v;
  }

  get Username() {
    return this.data.Username
  }

  set  Username(v) {
    this.data.Username = v;
  }

  get MediaType() {
    return this.data.MediaType
  }

  set  MediaType(v) {
    this.data.MediaType = v;
  }

  get TmdbId() {
    return this.data.TmdbId
  }

  set  TmdbId(v) {
    this.data.TmdbId = v;
  }

  get ImdbId() {
    return this.data.ImdbId
  }

  set  ImdbId(v) {
    this.data.ImdbId = v;
  }

  get TvdbId() {
    return this.data.TvdbId
  }

  set  TvdbId(v) {
    this.data.TvdbId = v;
  }

  get RequestedByUsername() {
    return this.data.RequestedByUsername
  }

  set  RequestedByUsername(v) {
    this.data.RequestedByUsername = v;
  }



  constructor(data) {

    this.data = data || {};

  }



  toJSON() {
    return {
      Type: this.Type,
      MediaTitle: this.MediaTitle,
      Plot: this.Plot,
      Poster: this.Poster,
      Username: this.Username,
      Media_type: this.Media_type,
      TmdbId: this.TmdbId,
      ImdbId: this.ImdbId,
      TvdbId: this.TvdbId,
      RequestedByUsername: this.RequestedByUsername
    }
  }


  static find(fields) {

  }


  static save(request) {

  }


  bindData(notyData) {

    this.Type = notyData.notification_type;
    this.MediaTitle = notyData.mediatitle
    this.Plot = notyData.plot
    this.Poster = notyData.poster
    this.Username = notyData.username
    this.Media_type = notyData.media.media_type
    this.TmdbId = notyData.media.tmdbId
    this.ImdbId = notyData.media.imdbId
    this.TvdbId = notyData.media.tvdbId

    this.RequestedByUsername = notyData.request.requestedBy_username

    return this;

    }

  static bindData(notyData) {
    let req = new Request();
    req.bindData(notyData);
    return req;
  }


}
