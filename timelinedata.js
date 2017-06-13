d3.ddtimelines = d3.ddtimelines || {};
d3.ddtimelines.timelineData = function module() {

  function exports() {}

  exports.points = [];
  exports.timelines = [];

  var durations = [];

  exports.addPoints = function(_data) {
    exports.points = exports.points.concat(_data);
    exports.sortPoints(compare);
  };

  exports.addTimelines = function(_data) {
    _data.forEach(function(track, i) {
      if(!durations[i]) {
        durations[i] = [];
      }
      durations[i] = durations[i].concat(track.duration);
      exports.timelines[i] = durations[i];
    })
  };

  exports.sortPoints = function() {
    exports.points.sort(compare);
  }

  function compare(a, b) {
    if(a.at < b.at) {
      return -1;
    }
    if(a.at > b.at) {
      return 1;
    }
    return 0;
  }

  return exports;
};
