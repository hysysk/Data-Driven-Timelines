d3.ddtimelines = d3.ddtimelines || {};

d3.ddtimelines.lineChart = function module() {
  var svg;
  var sinceDate;
  var untilDate;
  var width = 500;
  var height = 500;

  function exports(_data) {
    var x = d3.scaleTime().range([0, width])
      .domain([sinceDate, untilDate]);

    var y = d3.scaleLinear().range([height / 2, 0])
      .domain(d3.extent(_data, function(d) {
      return +d.value;
    }));

    var line = d3.line()
      .defined(function(d) {
        return d.value[0] !== null;
      })
      .x(function(d) {
        return x(d.at);
      })
      .y(function(d) {
        return y(d.value);
      });

    var xAxis = d3.axisBottom()
      .scale(x);

    var yAxis = d3.axisLeft()
      .scale(y);

    if(!svg) {
      svg = d3.select(this)
        .append('svg')
        .classed('chart', true);

      var container = svg.append('g').classed('container-group', true);
      container.append('g').classed('chart-group', true);
      container.append('g').classed('x-axis-group axis', true);
      container.append('g').classed('y-axis-group axis', true);
    }

    svg.select(".chart-group").data([_data])
      .attr("class", "line")
      .attr("d", line);
  }

  exports.width = function(_x) {
    if(!arguments.length) return width;
    width = parseInt(_x);
    return this;
  };

  exports.height = function(_x) {
    if(!arguments.length) return height;
    height = parseInt(_x);
    return this;
  };

  exports.sinceDate = function(_x) {
    if(!arguments.length) return sinceDate;
    sinceDate = _x;
    return this;
  };

  exports.untilDate = function(_x) {
    if(!arguments.length) return untilDate;
    untilDate = _x;
    return this;
  };

  return exports;
};
