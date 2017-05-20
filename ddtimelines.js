var DDTimelines = function(settings) {
  // set the dimensions and margins
  var size = settings.size;
  var margin = { top: 20, right: 30, bottom: 30, left: 50 };
  var width = size[0] - margin.left - margin.right;
  var height = size[1] - margin.top - margin.bottom;

  // set the ranges
  var x = d3.scaleTime().range([0, width]);
  var y = d3.scaleLinear().range([height/2, 0]);
  var y2 = d3.scaleLinear().range([height/2, 0]);

  // dataset
  var dataset = d3.ddtimelines.timelineData();

  var forwardIndex = 1;
  var backwardIndex = 1;
  var loadedIndexes = [];

  var isFirstTimeLoad = false;

  // define the line
  var line = d3.line()
      .defined(function(d) { return d.value[0] !== null; })
      .x(function(d) { return x(d.at); })
      .y(function(d) { return y(d.value); });

  var barWidth = 5;

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
  var chartContainer = svg.append("g")
    .attr("class", "chartContainer");

  var lineContainer = chartContainer.append("g")
      .attr("class", "lineContainer")
      .append("path")
      .attr('vector-effect', 'non-scaling-stroke');

  var lineContainer2 = chartContainer.append("g")
      .attr("class", "lineContainer2")
      .append("path")
      .attr('vector-effect', 'non-scaling-stroke');

  var lineContainers = [lineContainer, lineContainer2];

  var barContainer = chartContainer.append("g")
      .attr("class", "barContainer");

  var barContainer2 = chartContainer.append("g")
      .attr("class", "barContainer2");

  var barContainers = [barContainer, barContainer2];

  var timelineContainer = chartContainer.append("g")
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
  var groupY2;

  var bisect = d3.bisector(function(d){return d.at;}).left;

  // Zoom controller
  var zoom = d3.zoom()
      .scaleExtent([1, 12])
      .on("zoom", onZoom);

  var translate = [0, 0];

  var backgroundRect = svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .call(zoom);

  backgroundRect.on('mousemove', onMouseMove);
  backgroundRect.on('mouseout', onMouseOut);

  d3.selectAll('.button--zoom').on('click', onZoomClick);

  var loading = d3.ddtimelines.spinner(svg, {'width':44, 'height':44, 'containerWidth':width, 'containerHeight':height});
  loading();
  loading.setVisible(false);

  // Focus line
  var focus = svg.append('g');
  focus.append('line')
    .attr('id', 'focusLineX')
    .attr('class', 'focusLine')
    .attr('pointer-events', 'none');

  // Zoom button
  d3.selectAll('.button__zoom').on('click', onZoomClick);

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

  function loadBarData(url) {
    loading.setVisible(true);
    d3.queue()
      .defer(d3.json, url)
      .await(function(error, _points) {
        if(error) throw error;

        // format the point data
        _points.data.forEach(function(d) {
          d.at = parseTime(d.at);
        });

        dataset.addPoints(_points.data);
        showBars();
        loading.setVisible(false);
      });
  }

  function loadLineData(url) {
    loading.setVisible(true);
    d3.queue()
      .defer(d3.json, url)
      .await(function(error, _points) {
        if(error) throw error;

        // format the point data
        _points.data.forEach(function(d) {
          d.at = parseTime(d.at);
        });

        dataset.addPoints(_points.data);
        showLine();
        loading.setVisible(false);
      });
  }

  function loadComboData(url) {
    loading.setVisible(true);
    d3.queue()
      .defer(d3.json, url)
      .await(function(error, _points) {
        if(error) throw error;

        _points.data.forEach(function(d) {
          d.at = parseTime(d.at);
        });

        dataset.addPoints(_points.data);
        showCombo();
        loading.setVisible(false);
      });
  }

  function loadTimelineData(url) {
    loading.setVisible(true);
    d3.queue()
      .defer(d3.json, url)
      .await(function(error, _timelines) {
        if(error) throw error;

        // format the timeline data
        _timelines.data.forEach(function(d) {
          d.start_at = parseTime(d.start_at);
          d.end_at = parseTime(d.end_at);
        });

        dataset.addTimelines(_timelines.data);
        showTimelines();
        loading.setVisible(false);
      });
  }

  function showBars() {
    // Scale the range of the data
    x.domain([sinceDate, untilDate]);
    y.domain(d3.extent(dataset.points, function(d) { return +d.value; }));

    var bars = barContainer.selectAll("rect")
      .data(dataset.points, function(d) { return d.at; });

    // exit
    bars.exit().remove()

    // enter
    bars.enter()
      .append("rect")
      .attr("x", function(d) { return x(d.at) - barWidth/2; })
      .attr("width", barWidth)
      .attr("y", function(d) { return y(d.value); })
      .attr("height", function(d) { return height/2 - y(d.value); });

    // update
    bars.attr("y", function(d) { return y(d.value); })
      .attr("height", function(d) { return height/2 - y(d.value); });

    groupY.call(axisY);
  }

  function showLine() {
    // Scale the range of the data
    x.domain([sinceDate, untilDate]);
    y.domain(d3.extent(dataset.points, function(d) { return +d.value; }));

    lineContainer.data([dataset.points])
      .attr("class", "line")
      .attr("d", line);

    // svg.append("g")
    //   .attr("class", "legend")
    //   .append("text")
    //   .attr("transform", "rotate(-90)")
    //   .attr("y", 0 - margin.left)
    //   .attr("x", 0 - height/4)
    //   .attr("dy", "1em")
    //   .attr("font-size", "14px")
    //   .text("気温");

    groupY.call(axisY);
  }

  function showCombo() {
    // Scale the range of the data
    x.domain([sinceDate, untilDate]);
    y.domain(d3.extent(dataset.points, function(d) { return +d.value[0]; }));
    y2.domain(d3.extent(dataset.points, function(d) { return +d.value[1]; }));

    if(!groupY2) {
      groupY2 = svg.append("g")
       .attr("transform", "translate(" + width + ",0)")
       .call(axisY2);
    }

    combination.forEach(function(type, index) {
      if(type == "line") {
        lineContainers[index].data([dataset.points])
          .attr("class", "line")
          .attr("d", d3.line()
            .defined(function(d) {
              if(index == 0) {
                return d.value[0]!==null;
              } else if(index == 1) {
                return d.value[1]!==null;
              }
            })
            .x(function(d){return x(d.at);})
            .y(function(d){
              if(index == 0) {
                return y(d.value[0]);
              } else if(index == 1) {
                return y2(d.value[1]);
              }
            })
          );
      } else if(type == "bar") {
        var bars = barContainers[index]
          .selectAll("rect")
          .data(dataset.points, function(d) { return d.at; });

        // exit
        bars.exit().remove();

        // enter
        bars.enter()
          .append("rect")
          .attr("x", function(d) { return x(d.at) - barWidth/2; })
          .attr("width", barWidth)
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
          });

        // update
        bars.attr("y", function(d) {
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
          });
      }
    });

    groupY.call(axisY);
    groupY2.call(axisY2);
  }

  function showTimelines() {
    dataset.timelines.forEach(function(tl, i) {
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

      // labels = timelineContainer.append("g")
      //   .attr("transform", "translate(0," + i * 20 + ")")
      //   .selectAll("text")
      //   .data(timelineBands);
      //
      // labels.enter()
      //   .append("text")
      //   .text(function(d){return d.label;})
      //   .attr("x", function(d){return d.start;})
      //   .attr("y", function(d){return height/2 + margin.bottom + (i+1)*12;})
      //   .attr("font-family", "sans-serif")
      //   .attr("font-size", 12);
      //
      // labels.exit().remove();

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
    var arrayIndex = bisect(dataset.points, posX, 0, dataset.points.length);
    var smaller = dataset.points[arrayIndex-1];
    var larger = dataset.points[arrayIndex];
    // if(typeof smaller !== 'undefined' && typeof larger !== 'undefined') {
    //   var match = posX - smaller.at < larger.at - posX ? smaller : larger;
    // }

    focus.select('#focusLineX')
      .attr('x1', x(posX)).attr('y1', 0)
      .attr('x2', x(posX)).attr('y2', height);
  }

  function onMouseOut() {

  }

  function onZoomClick() {
    if(d3.event.target.id === 'zoom_in') {
      console.log("zoom in");
    } else if(d3.event.target.id === 'zoom_out') {
      console.log("zoom out");
    } else {
      console.log("zoom reset");
    }
  }

  function onZoom() {
    var t = d3.event.transform;

    chartContainer.attr("transform", "translate(" + t.x + ",0) scale(" + t.k + ",1)");
    groupX.call(axisX.scale(t.rescaleX(x)));

    var newSinceDate, newUntilDate, newSinceDateString, newUntilDateString;
    if(Math.ceil(((t.x - width/2)/width) / t.k) == -forwardIndex) {
      newSinceDate = new Date(sinceDate.getTime() + duration*forwardIndex);
      newSinceDateString = formatTime(newSinceDate);

      newUntilDate = new Date(untilDate.getTime() + duration*forwardIndex);
      newUntilDateString = formatTime(newUntilDate);
      loadNewData(newSinceDateString, newUntilDateString);
      forwardIndex++;
    } else if(Math.floor(((t.x + width/2)/width) / t.k) == backwardIndex) {
      newSinceDate = new Date(sinceDate.getTime() - duration*backwardIndex);
      newSinceDateString = formatTime(newSinceDate);

      newUntilDate = new Date(untilDate.getTime() - duration*backwardIndex);
      newUntilDateString = formatTime(newUntilDate);
      loadNewData(newSinceDateString, newUntilDateString);
      backwardIndex++;
    }
  }
};
