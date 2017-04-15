var DDTimelines = function(settings) {
  // set the dimensions and margins
  var size = settings.size;
  var margin = { top: 20, right: 20, bottom: 30, left: 50 };
  var width = size[0] - margin.left - margin.right;
  var height = size[1] - margin.top - margin.bottom;

  // set the ranges
  var x = d3.scaleTime().range([0, width]);
  var y = d3.scaleLinear().range([height/2, 0]);

  // datasets
  var points = [];
  var timelines = [];

  var forwardIndex = 1;
  var backwardIndex = 1;
  var loadedIndexes = [];

  // define the line
  var line = d3.line()
      .x(function(d) { return x(d.at); })
      .y(function(d) { return y(d.value); });

  // define the timeline
  var timeline = d3.timeline()
      .size([width, height])
      .bandStart(function(d){return d.start_at;})
      .bandEnd(function(d){return d.end_at;})
      .maxBandHeight(20)
      .padding(5)
      .extent([settings.since, settings.until]);

  var parseTime = d3.timeParse("%Y-%m-%dT%H:%M:%SZ");
  var formatTime = d3.timeFormat("%Y-%m-%dT%H:%M:%SZ");

  var sinceDate = new Date(settings.since);
  var untilDate = new Date(settings.until);
  var duration = untilDate - sinceDate;

  // drawing area
  var svg = d3.select(settings.selector).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // containers
  var pointsContainer = svg.append("g")
      .append("path")
      .attr("class", "points");
  var timelineContainer = svg.append("g")
      .attr("class", "timelines");

  // Add the X Axis
  var axisX = d3.axisTop(x);
  var groupX = svg.append("g")
    .call(axisX);

  // Add the Y Axis
  var axisY = d3.axisLeft(y);
  var groupY = svg.append("g")
    .call(axisY);

  // Zoom controller
  var zoom = d3.zoom()
      .on("zoom", onZoom);

  var zoomRect = svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .call(zoom);

  loadNewData(settings.since, settings.until);

  // timelinesのtypeを読む
  function loadNewData(since, until) {
    settings.timelines.forEach(function(tl) {
      var url = buildUrl(tl.url, since, until, tl.queries);
      switch (tl.type) {
        case "line":
          loadLineData(url);
          break;
        case "bar":

          break;
        case "dual":

          break;
        case "duration":
          loadTimelineData(url);
          break;
        case "event":

          break;
        default:
          console.error("Specify the type: line, bar, dual, duration, event");
      }
    });
  }

  function buildUrl(endpoint, since, until, queries) {
    var q = endpoint + "?since=" + encodeURIComponent(since) + "&until="+ encodeURIComponent(until);
    Object.keys(queries).forEach(function(key) {
      q += "&" + key + "=" + queries[key];
    });
    return q;
  }

  function loadLineData(url) {
    d3.queue()
      .defer(d3.json, url)
      .await(function(error, _points) {
        if(error) throw error;

        // format the point data
        _points.data.forEach(function(d) {
          d.at = parseTime(d.at);
          d.value = +d.value;
        });

        points = points.concat(_points.data);
        showPoints();
      });
  }

  function loadTimelineData(url) {
    d3.queue()
      .defer(d3.json, url)
      .await(function(error, _timelines) {
        if(error) throw error;

        // format the timeline data
        _timelines.data.forEach(function(d) {
          d.start_at = parseTime(d.start_at);
          d.end_at = parseTime(d.end_at);
        });

        timelines = _timelines.data;
        showTimelines();
      });
  }

  function showPoints() {
    // Scale the range of the data
    x.domain([sinceDate, untilDate]);
    y.domain(d3.extent(points, function(d) { return d.value; }));

    pointsContainer.data([points])
      .attr("class", "line")
      .attr("d", line);

    groupY.call(axisY);
  }

  var isFirstTimeLoad = false;

  function showTimelines() {
    timelines.forEach(function(tl, i) {
      var timelineBands = timeline(tl.duration);
      var rects = timelineContainer.append("g")
        .attr("transform", "translate(0," + i * 17 + ")")
        .selectAll("rect")
        .data(timelineBands);

      rects.enter()
        .append("rect")
        .merge(rects)
        .attr("x", function(d){return d.start;})
        .attr("y", function(d){return height/2 + margin.bottom + i*d.dy;})
        .attr("height", function(d){return d.dy;})
        .attr("width", function(d){return d.end - d.start;})
        .attr("class", function(d){return d.class;});

      rects.exit().remove();

      var labels = timelineContainer.append("g")
        .attr("transform", "translate(0," + i * 20 + ")")
        .selectAll("text")
        .data(timelineBands);

      labels.enter()
        .append("text")
        .text(function(d){return d.label;})
        .attr("x", function(d){return d.start;})
        .attr("y", function(d){return height/2 + margin.bottom + (i+1)*12;})
        .attr("font-family", "sans-serif")
        .attr("font-size", 12);

      labels.exit().remove();

      if(!isFirstTimeLoad) {
        d3.select("svg").append("g").append("text")
          .text(tl.label)
          .attr("y", height/2 + margin.bottom + (i+1)*32)
          .attr("x", 0)
          .attr("font-family", "sans-serif")
          .attr("font-size", 12);
      }
    });
    isFirstTimeLoad = true;
  }

  function onZoom() {
    var t = d3.event.transform;
    pointsContainer.attr("transform", "translate(" + t.x + ",0) scale(" + t.k + ",1)");
    timelineContainer.attr("transform", "translate(" + t.x + ",0) scale(" + t.k + ",1)");
    groupX.call(axisX.scale(t.rescaleX(x)));

    var newSinceDate, newUntilDate, newSinceDateString, newUntilDateString;
    if(Math.ceil((t.x/width) / t.k) == -forwardIndex) {
      forwardIndex++;

      newSinceDate = new Date(sinceDate.getTime() + duration*forwardIndex);
      newSinceDateString = formatTime(newSinceDate);

      newUntilDate = new Date(untilDate.getTime() + duration*forwardIndex);
      newUntilDateString = formatTime(newUntilDate);
      loadNewData(newSinceDateString, newUntilDateString);
    } else if(Math.floor((t.x/width) / t.k) == backwardIndex) {
      backwardIndex++;

      newSinceDate = new Date(sinceDate.getTime() - duration*backwardIndex);
      newSinceDateString = formatTime(newSinceDate);

      newUntilDate = new Date(untilDate.getTime() - duration*backwardIndex);
      newUntilDateString = formatTime(newUntilDate);
      loadNewData(newSinceDateString, newUntilDateString);
    }
  }
};
