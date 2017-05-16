d3.ddtimelines = d3.ddtimelines || {};
d3.ddtimelines.timelineData = function module() {

  function exports() {}

  exports.points = [];
  exports.timelines = [];

  exports.addPoints = function(_data) {
    exports.points = exports.points.concat(_data);
  };

  exports.addTimelines = function(_data) {
    exports.timelines = _data;
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
