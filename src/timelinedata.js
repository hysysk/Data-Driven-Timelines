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
    for(var i=0; i<_data.length; i++) {
      if(!durations[i]) {
        durations[i] = _data[i].duration;
      }
      for(var j=0, newDataLength=_data[i].duration.length; j<newDataLength; j++) {
        var isTheSameData = false;
        for(var k=0, oldDataLength=durations[i].length; k<oldDataLength; k++) {
          if(JSON.stringify(_data[i].duration[j]) === JSON.stringify(durations[i][k])) {
            isTheSameData = true;
          }
        }
        if(!isTheSameData) {
          durations[i].push(_data[i].duration[j])
        }
      }
    }

    exports.timelines = durations;
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
