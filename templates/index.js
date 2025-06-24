module.exports = {
  // plex
  template_7: require('./movie'),
  template_14: require('./movie'),
  template_30: require('./movie'),
  template_31: require('./movie'),

  template_9: require('./show'),
  template_13: require('./show'),
  template_27: require('./show'),
  template_35: require('./show'),

  template_25: require('./videos_collections'),
  template_16: require('./videos'),

  // emby
  template_movies: require('./movie'),
  template_series: require('./show'),
  template_tvshows: require('./show'),

  template_25: require('./videos_collections'),
  template_16: require('./videos'),


  template_mounted: require('./mantainance').mounted,
  template_umounted: require('./mantainance').unmounted,

  template_new_version: require('./new_version')
};
