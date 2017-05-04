var DDTimelines = function(settings) {
  // set the dimensions and margins
  var size = settings.size;
  var margin = { top: 20, right: 20, bottom: 30, left: 50 };
  var width = size[0] - margin.left - margin.right;
  var height = size[1] - margin.top - margin.bottom;

  // set the ranges
  var x = d3.scaleTime().range([0, width]);
  var y = d3.scaleLinear().range([height/2, 0]);
  var y2 = d3.scaleLinear().range([height/2, 0]);

  // datasets
  var points = [];
  var timelines = [];

  var forwardIndex = 1;
  var backwardIndex = 1;
  var loadedIndexes = [];

  var isFirstTimeLoad = false;

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

  var formatString = "%Y-%m-%dT%H:%M:%S"+ String(settings.utcOffset);
  var parseTime = d3.timeParse(formatString);
  var formatTime = d3.timeFormat(formatString);

  var sinceDate = new Date(settings.since+settings.utcOffset);
  var untilDate = new Date(settings.until+settings.utcOffset);
  var duration = untilDate - sinceDate;

  // drawing area
  var svg = d3.select(settings.selector).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // containers
  var lineContainer = svg.append("g")
      .attr("class", "lineContainer")
      .append("path")
      .attr('vector-effect', 'non-scaling-stroke');

  var lineContainer2 = svg.append("g")
      .attr("class", "lineContainer2")
      .append("path")
      .attr('vector-effect', 'non-scaling-stroke');

  var lineContainers = [lineContainer, lineContainer2];

  var barContainer = svg.append("g")
      .attr("class", "barContainer");

  var barContainer2 = svg.append("g")
      .attr("class", "barContainer2");

  var barContainers = [barContainer, barContainer2];

  var timelineContainer = svg.append("g")
      .attr("class", "timelines");

  var labels;

  var combination;

  // Add the X Axis
  var axisX = d3.axisBottom(x)
    .tickSize(height);
  var groupX = svg.append("g")
    .call(axisX);

  // Add the Y Axis
  var axisY = d3.axisLeft(y);
  var groupY = svg.append("g")
    .call(axisY);
  var axisY2 = d3.axisRight(y2);
  var groupY2 = svg.append("g")
    .attr("transform", "translate(" + width + ",0)")
    .call(axisY2);

  var bisect = d3.bisector(function(d){return d.at;}).left;

  // Zoom controller
  var zoom = d3.zoom()
      .scaleExtent([1, 12])
      .on("zoom", onZoom);

  var backgroundRect = svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .call(zoom);

  backgroundRect.on('mousemove', onMouseMove);
  backgroundRect.on('mouseout', onMouseOut);

  // Focus line
  var focus = svg.append('g');
  focus.append('line')
    .attr('id', 'focusLineX')
    .attr('class', 'focusLine')
    .attr('pointer-events', 'none');

  loadNewData(settings.since+settings.utcOffset, settings.until+settings.utcOffset);

  // timelinesのtypeを読む
  function loadNewData(since, until) {
    settings.timelines.forEach(function(tl) {
      var url = buildUrl(tl.url, since, until, tl.queries);
      switch (tl.type) {
        case "line":
          loadLineData(url);
          break;
        case "bar":
          loadBarData(url);
          break;
        case "combo":
          combination = tl.combination;
          loadComboData(url);
          break;
        case "duration":
          loadTimelineData(url);
          break;
        case "event":

          break;
        default:
          console.error("Specify the type: line, bar, combo, duration, event");
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

  function compare(a, b) {
    if(a.at < b.at) {
      return -1;
    }
    if(a.at > b.at) {
      return 1;
    }
    return 0;
  }

  function loadBarData(url) {
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
        points.sort();
        showBars();
      });
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
        points.sort(compare);
        showLine();
      });
  }

  function loadComboData(url) {
    d3.queue()
      .defer(d3.json, url)
      .await(function(error, _points) {
        if(error) throw error;

        _points.data.forEach(function(d) {
          d.at = parseTime(d.at);
          d.value[0] = +d.value[0];
          d.value[1] = +d.value[1];
        });

        points = points.concat(_points.data);
        points.sort(compare);
        showCombo();
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

  function showBars() {
    // Scale the range of the data
    x.domain([sinceDate, untilDate]);
    y.domain(d3.extent(points, function(d) { return d.value; }));

    var bars = barContainer
      .selectAll("rect")
      .data(points);

    bars.enter()
      .append("rect")
      .attr("x", function(d) { return x(d.at); })
      .attr("width", 10)
      .attr("y", function(d) { return y(d.value); })
      .attr("height", function(d) { return height/2 - y(d.value); });

    groupY.call(axisY);
  }

  function showLine() {
    // Scale the range of the data
    x.domain([sinceDate, untilDate]);
    y.domain(d3.extent(points, function(d) { return d.value; }));

    lineContainer.data([points])
      .attr("class", "line")
      .attr("d", line);

    groupY.call(axisY);
  }

  function showCombo() {
    // Scale the range of the data
    x.domain([sinceDate, untilDate]);
    y.domain(d3.extent(points, function(d) { return d.value[0]; }));
    y2.domain(d3.extent(points, function(d) { return d.value[1]; }));

    combination.forEach(function(type, index) {
      if(type == "line") {
        lineContainers[index].data([points])
          .attr("class", "line")
          .attr("d", d3.line()
            .x(function(d){return x(d.at);})
            .y(function(d){
              if(index == 0) {
                return y(d.value[0]);
              } else if(index == 1) {
                return y2(d.value[1]);
              }
            }
          )
        );
      } else if(type == "bar") {
        var bars = barContainers[index]
          .selectAll("rect")
          .data(points);

        bars.enter()
          .append("rect")
          .attr("x", function(d) { return x(d.at); })
          .attr("width", 10)
          .attr("y", function(d) {
            if(index == 0) {
              return y(d.value[0]);
            } else if(index == 1) {
              return y2(d.value[1]);
            }
          })
          .attr("height", function(d) {
            if(index == 0) {
              return height/2 - y(d.value[0]);
            } else if(index == 1) {
              return height/2 - y2(d.value[1]);
            }
          }
        );
      }
    });

    groupY.call(axisY);
    groupY2.call(axisY2);
  }

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

      labels = timelineContainer.append("g")
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
          .attr("x", margin.left - 30)
          .attr("font-family", "sans-serif")
          .attr("font-size", 12)
          .attr("text-anchor", "right");
      }
    });
    isFirstTimeLoad = true;
  }

  function onMouseMove() {
    var coords = d3.mouse(this);
    var posX = x.invert(coords[0]);
    var arrayIndex = bisect(points, posX, 0, points.length);
    var smaller = points[arrayIndex-1];
    var larger = points[arrayIndex];
    // if(typeof smaller !== 'undefined' && typeof larger !== 'undefined') {
    //   var match = posX - smaller.at < larger.at - posX ? smaller : larger;
    // }

    focus.select('#focusLineX')
      .attr('x1', x(posX)).attr('y1', 0)
      .attr('x2', x(posX)).attr('y2', height);
  }

  function onMouseOut() {

  }

  function onZoom() {
    var t = d3.event.transform;
    lineContainer.attr("transform", "translate(" + t.x + ",0) scale(" + t.k + ",1)");
    lineContainer2.attr("transform", "translate(" + t.x + ",0) scale(" + t.k + ",1)");
    barContainer.attr("transform", "translate(" + t.x + ",0) scale(" + t.k + ",1)");
    barContainer2.attr("transform", "translate(" + t.x + ",0) scale(" + t.k + ",1)");
    timelineContainer.attr("transform", "translate(" + t.x + ",0) scale(" + t.k + ",1)");

    groupX.call(axisX.scale(t.rescaleX(x)));

    var newSinceDate, newUntilDate, newSinceDateString, newUntilDateString;
    if(Math.ceil((t.x/width) / t.k) == -forwardIndex) {
      newSinceDate = new Date(sinceDate.getTime() + duration*forwardIndex);
      newSinceDateString = formatTime(newSinceDate);

      newUntilDate = new Date(untilDate.getTime() + duration*forwardIndex);
      newUntilDateString = formatTime(newUntilDate);
      loadNewData(newSinceDateString, newUntilDateString);
      forwardIndex++;
    } else if(Math.floor((t.x/width) / t.k) == backwardIndex) {
      newSinceDate = new Date(sinceDate.getTime() - duration*backwardIndex);
      newSinceDateString = formatTime(newSinceDate);

      newUntilDate = new Date(untilDate.getTime() - duration*backwardIndex);
      newUntilDateString = formatTime(newUntilDate);
      loadNewData(newSinceDateString, newUntilDateString);
      backwardIndex++;
    }
  }
};
