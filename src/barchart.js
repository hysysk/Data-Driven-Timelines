d3.ddtimelines = d3.ddtimelines || {};

d3.ddtimelines.barChart = function module() {
  var margin = {top: 20, right: 20, bottom: 40, left: 40},
  width = 500, height = 500, gap = 0, ease = d3.easeBounce;
  var svg;

  var dispatch = d3.dispatch('customHover');

  function exports(_selection) {
    _selection.each(function(_data) {
      var chartW = width - margin.left - margin.right,
        chartH = height - margin.top - margin.bottom;

      var x1 = d3.scaleBand()
        .domain(_data.map(function(d, i) { return i; }))
        .rangeRound([0, chartW], 0.1);

      var y1 = d3.scaleLinear()
        .domain([0, d3.max(_data, function(d, i) { return d; })])
        .range([chartH, 0]);

      var xAxis = d3.axisBottom()
        .scale(x1);

      var yAxis = d3.axisLeft()
        .scale(y1);

      var barW = chartW / _data.length;

      if(!svg) {
        svg = d3.select(this)
          .append('svg')
          .classed('chart', true);

        var container = svg.append('g').classed('container-group', true);
        container.append('g').classed('chart-group', true);
        container.append('g').classed('x-axis-group axis', true);
        container.append('g').classed('y-axis-group axis', true);
      }

      svg.transition().attr("width", width)
        .attr("height", height);

      svg.select(".container-group")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      svg.select(".x-axis-group.axis")
        .transition()
        .ease(ease)
        .attr("transform", "translate(0," + (chartH) + ")")
        .call(xAxis);

      svg.select(".y-axis-group.axis")
        .transition()
        .ease(ease)
        .call(yAxis);

      var gapSize = x1.bandwidth() / 100 * gap;
      var barW = x1.bandwidth() - gapSize;
      var bars = svg.select(".chart-group")
        .selectAll(".bar")
        .data(_data);

      // EXIT old elements not present in new data
      bars.exit().remove();

      // UPDATE old elements present in new data
      bars.transition()
        .ease(ease)
        .attr("x", function(d, i) { return x1(i) + gapSize/2; })
        .attr("y", function(d, i) { return y1(d); })
        .attr("width", barW)
        .attr("height", function(d, i) { return chartH - y1(d); });

      // ENTER new elements present in new data
      bars.enter().append("rect")
        .classed("bar", true)
        .transition()
        .ease(ease)
        .attr("x", function(d, i) { return x1(i) + gapSize/2; })
        .attr("y", function(d, i) { return y1(d); })
        .attr("width", barW)
        .attr("height", function(d, i) { return chartH - y1(d); });
    });
  };

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

  exports.gap = function(_x) {
    if(!arguments.length) return gap;
    gap = _x;
    return this;
  };

  exports.ease = function(_x) {
    if(!arguments.length) return ease;
    ease = _x;
    return this;
  };

  exports.on = function() {
    var value = dispatch.on.apply(dispatch, arguments);
    return value === dispatch ? exports : value;
  };

  return exports;
};
