const DiskDB = require('diskdb')
const {Config} = require('../../utils');
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


const NotyType = {
  MEDIA_PENDING: 'REQUESTED',
  MEDIA_DECLINED: 'REFUSED',
  MEDIA_APPROVED: 'APPROVED',
  MEDIA_AVAILABLE: 'AVAILABLE'
};


class Request {

  static get TYPES() {
    return NotyType;
  }


  get ID() {
    return this.data._id;
  }

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

  get RequestID() {
    return this.data.RequestID;
  }

  set RequestID(v) {
    this.data.RequestID = v;
  }

  get CleanedMediaTitle() {
    return Request.cleanMediaTitle(this.MediaTitle);
  }



  constructor(reqdata) {
    this.data = {};
    this.bindData( reqdata || {media: {}, request: {}} );

    console.log('WH: Building overseer request');
    console.log('WH: ', JSON.stringify(reqdata) );
    console.log('WH: remapped to');
    console.log('WH: ', JSON.stringify(this) );

    this.data._id = reqdata._id;

  }


  toJSON() {
    return {
      Type: this.Type,
      MediaTitle: this.MediaTitle,
      CleanedMediaTitle: this.CleanedMediaTitle,
      Plot: this.Plot,
      Poster: this.Poster,
      MediaType: this.MediaType,
      TmdbId: this.TmdbId,
      ImdbId: this.ImdbId,
      TvdbId: this.TvdbId,
      RequestedByUsername: this.RequestedByUsername,
      RequestID: this.RequestID
    }
  }


  save() {
    let req = Request.save( this );
    if (req) {
      this.data._id = req.ID;
    }
    return this;
  }


  static find(fields) {
    let d = DB.requests.findOne(fields)
    if ( d ) {
      return new Request(d);
    }
    return null;
  }


  static save(request) {
    let update = false;
    if ( request instanceof Request ) {
      update = request.ID;
      request = request.toJSON();
    }

    if ( !!update ) {
      DB.requests.update( {_id: update}, request, {multi: false, upsert: false} );
    } else {
      let nd = DB.requests.save( request );
      return new Request(nd);
    }
  }


  bindData(notyData) {

    let notytype = notyData.Type || notyData.notification_type;
    let t = NotyType[ notytype ];

    this.Type = notyData.Type || t;
    this.MediaTitle = notyData.MediaTitle !== undefined ? notyData.MediaTitle : notyData.mediatitle;
    this.Plot = notyData.Plot !== undefined ? notyData.Plot : notyData.plot;
    this.Poster = notyData.Poster !== undefined ? notyData.Poster : notyData.poster;
    this.MediaType = notyData.MediaType !== undefined ? notyData.MediaType : notyData.media.media_type;
    this.TmdbId = notyData.TmdbId !== undefined ? notyData.TmdbId : notyData.media.tmdbId;
    this.ImdbId = notyData.ImdbId !== undefined ? notyData.ImdbId : (notyData.media ? notyData.media.imdbId : '');
    this.TvdbId = notyData.TvdbId !== undefined ? notyData.TvdbId : notyData.media.tvdbId;

    this.RequestedByUsername = notyData.RequestedByUsername || notyData.request.requestedBy_username;
    this.RequestID = notyData.RequestID || notyData.request.request_id;

    return this;

  }

  static bindData(notyData) {
    let req = new Request();
    req.bindData(notyData);
    return req;
  }


  static cleanMediaTitle( mediatitle ) {

    return mediatitle.replace( /[^a-z0-9\(\)\s]/gi, '' );

  }


}


module.exports = Request;
