var DDTimelines = function(settings) {
  // set the dimensions and margins
  var size = settings.size;
  var margin = {
    top: 20,
    right: 50,
    bottom: 30,
    left: 50
  };
  var width = size[0] - margin.left - margin.right;
  var height = size[1] - margin.top - margin.bottom;

  // set the ranges
  var x = d3.scaleTime().range([0, width]);
  var y = d3.scaleLinear().range([height / 2, 0]);
  var y2 = d3.scaleLinear().range([height / 2, 0]);

  // dataset
  var dataset = d3.ddtimelines.timelineData();

  var forwardIndex = 1;
  var backwardIndex = 1;
  var loadedIndexes = [];

  // define the line
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

  var barWidth = 5;

  // define the timeline
  var timeline = d3.timeline()
    .size([width, height])
    .bandStart(function(d) {
      return d.start_at;
    })
    .bandEnd(function(d) {
      return d.end_at;
    })
    .maxBandHeight(20)
    .padding(5)
    .extent([settings.since, settings.until]);

  var formatString = "%Y-%m-%dT%H:%M:%S" + String(settings.utcOffset);
  var parseTime = d3.timeParse(formatString);
  var formatTime = d3.timeFormat(formatString);

  var sinceDate = new Date(settings.since + settings.utcOffset);
  var untilDate = new Date(settings.until + settings.utcOffset);
  var duration = untilDate - sinceDate;

  // drawing area
  var svg = d3.select(settings.selector).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  var g = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.append("defs").append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("width", width)
    .attr("height", height);

  // containers
  var chartContainer = g.append("g")
    .attr("class", "chartWrapper")
    .attr("clip-path", "url(#clip)")
    .append("g")
    .attr("class", "chartContainer");

  var lineContainer = chartContainer.append("g")
    .attr("class", "lineContainer")
    .append("path")
    .attr("vector-effect", "non-scaling-stroke");

  var lineContainer2 = chartContainer.append("g")
    .attr("class", "lineContainer2")
    .append("path")
    .attr("vector-effect", "non-scaling-stroke");

  var lineContainers = [lineContainer, lineContainer2];

  var barContainer = chartContainer.append("g")
    .attr("class", "barContainer");

  var barContainer2 = chartContainer.append("g")
    .attr("class", "barContainer2");

  var barContainers = [barContainer, barContainer2];

  var timelineContainer = chartContainer.append("g")
    .attr("class", "timelines");

  var overlay = g.append("g")
    .attr("class", "overlay");

  var focusLines = [];

  var labels;

  // label
  settings.timelines.forEach(function(tl) {
    if (tl.type == "line" || tl.type == "bar") {
      g.append("g")
        .attr("class", "label")
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - height / 4)
        .attr("dy", "1em")
        .attr("font-size", 12)
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "middle")
        .text(tl.labels[0]);
    } else if (tl.type == "combo") {
      g.append("g")
        .attr("class", "label")
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - height / 4)
        .attr("dy", "1em")
        .attr("font-size", 12)
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "middle")
        .text(tl.labels[0]);

      g.append("g")
        .attr("class", "label")
        .append("text")
        .attr("transform", "rotate(90)")
        .attr("x", height / 4)
        .attr("y", -width - margin.right)
        .attr("dy", "1em")
        .attr("font-size", 12)
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "middle")
        .text(tl.labels[1]);
    } else if (tl.type == "duration") {
      tl.labels.forEach(function(text, i) {
        g.append("g")
          .attr("class", "label")
          .append("text")
          .text(text)
          .attr("y", height / 2 + margin.bottom + (i + 1) * 32 - 20)
          .attr("x", margin.left - 84)
          .attr("font-family", "sans-serif")
          .attr("font-size", 12)
          .attr("text-anchor", "right");
      });
    }
  });

  var combination;

  // Add the X Axis
  var axisX = d3.axisBottom(x)
    .tickSize(height);
  var groupX = g.append("g")
    .call(axisX);

  // Add the Y Axis
  var axisY = d3.axisLeft(y);
  var groupY = g.append("g")
    .call(axisY);
  var axisY2 = d3.axisRight(y2);
  var groupY2;

  var bisect = d3.bisector(function(d) {
    return d.at;
  }).left;

  // Zoom controller
  var zoom = d3.zoom()
    .scaleExtent([1, 12])
    .on("zoom", onZoom);

  // Zoom button
  d3.selectAll(".button_zoom").on("click", onZoomClick);

  // Export button
  d3.selectAll(".button_export").on("click", onExportClick);

  var focusRect = g.append("rect")
    .attr("class", "focus")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .call(zoom);

  focusRect.on('mousemove', onMouseMove);
  focusRect.on('click', onMouseClick);

  d3.selectAll('.button--zoom').on('click', onZoomClick);

  // Focus line
  var focus = g.append("g");
  focus.append("line")
    .attr("id", "focusLineX")
    .attr("class", "focusLine")
    .attr("pointer-events", "none");

  var labelMarginLeft = 4;

  var focusPointValue = g.append("text")
    .attr("class", "point1")
    .attr("pointer-events", "none");

  var focusPointValue2 = g.append("text")
    .attr("class", "point2")
    .attr("pointer-events", "none");

  var focusDurationValues = [];
  settings.timelines.forEach(function(tl) {
    if (tl.type == 'duration') {
      tl.labels.forEach(function(d, i) {
        var label = g.append("text").attr("class", "duration" + i)
          .attr("pointer-events", "none");
        focusDurationValues.push(label);
      })
    }
  });

  var loading = d3.ddtimelines.spinner(svg, {
    "width": 44,
    "height": 44,
    "containerWidth": settings.size[0],
    "containerHeight": settings.size[1]
  });
  loading();
  loading.setVisible(false);

  loadNewData(settings.since + settings.utcOffset, settings.until + settings.utcOffset);

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
    var q = endpoint + "?since=" + encodeURIComponent(since) + "&until=" + encodeURIComponent(until);
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
        if (error) throw error;

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
        if (error) throw error;

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
        if (error) throw error;

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
        if (error) throw error;

        dataset.addTimelines(_timelines.data);
        showTimelines();
        loading.setVisible(false);
      });
  }

  function showBars() {
    // Scale the range of the data
    x.domain([sinceDate, untilDate]);
    y.domain(d3.extent(dataset.points, function(d) {
      return +d.value;
    }));

    var bars = barContainer.selectAll("rect")
      .data(dataset.points, function(d) {
        return d.at;
      });

    // exit
    bars.exit().remove()

    // enter
    bars.enter()
      .append("rect")
      .attr("x", function(d) {
        return x(d.at) - barWidth / 2;
      })
      .attr("width", barWidth)
      .attr("y", function(d) {
        return y(d.value);
      })
      .attr("height", function(d) {
        return height / 2 - y(d.value);
      });

    // update
    bars.attr("y", function(d) {
        return y(d.value);
      })
      .attr("height", function(d) {
        return height / 2 - y(d.value);
      });

    groupX.call(axisX);
    groupY.call(axisY);
  }

  function showLine() {
    // Scale the range of the data
    x.domain([sinceDate, untilDate]);
    y.domain(d3.extent(dataset.points, function(d) {
      return +d.value;
    }));

    lineContainer.data([dataset.points])
      .attr("class", "line")
      .attr("d", line);

    groupX.call(axisX);
    groupY.call(axisY);
  }

  function showCombo() {
    // Scale the range of the data
    x.domain([sinceDate, untilDate]);
    y.domain(d3.extent(dataset.points, function(d) {
      return +d.value[0];
    }));
    y2.domain(d3.extent(dataset.points, function(d) {
      return +d.value[1];
    }));

    if (!groupY2) {
      groupY2 = g.append("g")
        .attr("transform", "translate(" + width + ",0)")
        .call(axisY2);
    }

    combination.forEach(function(type, index) {
      if (type == "line") {
        lineContainers[index].data([dataset.points])
          .attr("class", "line")
          .attr("d", d3.line()
            .defined(function(d) {
              if (index == 0) {
                return d.value[0] !== null;
              } else if (index == 1) {
                return d.value[1] !== null;
              }
            })
            .x(function(d) {
              return x(d.at);
            })
            .y(function(d) {
              if (index == 0) {
                return y(d.value[0]);
              } else if (index == 1) {
                return y2(d.value[1]);
              }
            })
          );
      } else if (type == "bar") {
        var bars = barContainers[index]
          .selectAll("rect")
          .data(dataset.points, function(d) {
            return d.at;
          });

        // exit
        bars.exit().remove();

        // enter
        bars.enter()
          .append("rect")
          .attr("x", function(d) {
            return x(d.at) - barWidth / 2;
          })
          .attr("width", barWidth)
          .attr("y", function(d) {
            if (index == 0) {
              return y(d.value[0]);
            } else if (index == 1) {
              return y2(d.value[1]);
            }
          })
          .attr("height", function(d) {
            if (index == 0) {
              return height / 2 - y(d.value[0]);
            } else if (index == 1) {
              return height / 2 - y2(d.value[1]);
            }
          });

        // update
        bars.attr("y", function(d) {
            if (index == 0) {
              return y(d.value[0]);
            } else if (index == 1) {
              return y2(d.value[1]);
            }
          })
          .attr("height", function(d) {
            if (index == 0) {
              return height / 2 - y(d.value[0]);
            } else if (index == 1) {
              return height / 2 - y2(d.value[1]);
            }
          });
      }
    });

    groupX.call(axisX);
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
        .attr("x", function(d) {
          return d.start;
        })
        .attr("y", function(d) {
          return height / 2 + margin.bottom + i * d.dy;
        })
        .attr("height", function(d) {
          return d.dy;
        })
        .attr("width", function(d) {
          return d.end - d.start;
        })
        .attr("class", function(d) {
          return d.class;
        });

      rects.exit().remove();
    });

    groupX.call(axisX);
  }

  function onMouseMove() {
    var transform = d3.zoomTransform(this);
    var xt = transform.rescaleX(x);
    var coords = d3.mouse(this);
    var posX = xt.invert(coords[0]);
    var arrayIndex = bisect(dataset.points, posX, 0, dataset.points.length);
    var smaller = dataset.points[arrayIndex - 1];
    var larger = dataset.points[arrayIndex];
    if (typeof smaller !== 'undefined' && typeof larger !== 'undefined') {
      var match = posX - smaller.at < larger.at - posX ? smaller : larger;
      focusPointValue.text(match.value[0])
        .attr("x", transform.applyX(x(match.at)) + labelMarginLeft)
        .attr("y", y(match.value[0]))
        .attr("font-family", "sans-serif")
        .attr("font-size", 12);

      focusPointValue2.text(match.value[1])
        .attr("x", transform.applyX(x(match.at)) + labelMarginLeft)
        .attr("y", y2(match.value[1]))
        .attr("font-family", "sans-serif")
        .attr("font-size", 12);
    }

    dataset.timelines.forEach(function(timeline, index) {
      var isFocusOver = false;
      timeline.duration.forEach(function(d, i) {
        if (coords[0] >= transform.applyX(x(parseTime(d.start_at))) && coords[0] <= transform.applyX(x(parseTime(d.end_at)))) {
          focusDurationValues[index].text(d.label)
            .attr("x", coords[0] + labelMarginLeft)
            .attr("y", height / 2 + index * 32 + 42)
            .attr("font-family", "sans-serif")
            .attr("font-size", 12);
          isFocusOver = true;
        } else {
          if (!isFocusOver) {
            focusDurationValues[index].text("");
          }
        }
      });
    });

    focus.select('#focusLineX')
      .attr("x1", transform.applyX(x(posX))).attr('y1', 0)
      .attr("x2", transform.applyX(x(posX))).attr('y2', height);
  }

  function onMouseClick() {

  }

  function onExportClick() {
    var doctype = '<?xml version="1.0" standalone="no"?>' +
      '<?xml-stylesheet href="ddtimelines.css" type="text/css"?>' +
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';

    var svgDomElement = d3.select('svg').node();

    generateStyleDefs(svgDomElement);

    // serialize our SVG XML to a string.
    var source = (new XMLSerializer()).serializeToString(svgDomElement);

    // create a file blob of our SVG.
    var blob = new Blob([doctype + source], {
      type: 'image/svg+xml;charset=utf-8'
    });

    var url = window.URL.createObjectURL(blob);

    if (d3.event.target.id == "export_png") {
      // Put the svg into an image tag so that the Canvas element can read it in.
      var img = d3.select('body').append('img')
        .attr('width', size[0])
        .attr('height', size[1])
        .node();
      img.src = url;
    }
  }

  function generateStyleDefs(svgDomElement) {
    var styleDefs = "";
    var sheets = document.styleSheets;
    for (var i = 0; i < sheets.length; i++) {
      var rules = sheets[i].cssRules;
      for (var j = 0; j < rules.length; j++) {
        var rule = rules[j];
        if (rule.style) {
          var selectorText = rule.selectorText;
          var elems = svgDomElement.querySelectorAll(selectorText);

          if (elems.length) {
            styleDefs += selectorText + " { " + rule.style.cssText + " }\n";
          }
        }
      }
    }

    var s = document.createElement('style');
    s.setAttribute('type', 'text/css');
    s.innerHTML = styleDefs;

    var defs = document.createElement('defs');
    defs.appendChild(s);
    svgDomElement.insertBefore(defs, svgDomElement.firstChild);
  }

  function onZoomClick() {
    if (d3.event.target.id === 'zoom_in') {
      zoom.scaleBy(chartContainer, 2);
      zoom.scaleBy(focusRect, 2);
    } else if (d3.event.target.id === 'zoom_out') {
      zoom.scaleBy(chartContainer, 0.5);
      zoom.scaleBy(focusRect, 0.5);
    } else if (d3.event.target.id === 'zoom_reset') {
      chartContainer.call(zoom.transform, d3.zoomIdentity);
      focusRect.call(zoom.transform, d3.zoomIdentity);
    }
  }

  function onZoom() {
    var t = d3.event.transform;

    chartContainer.attr("transform", "translate(" + t.x + ",0) scale(" + t.k + ",1)");
    groupX.call(axisX.scale(t.rescaleX(x)));

    var newSinceDate, newUntilDate, newSinceDateString, newUntilDateString;
    if (Math.ceil(((t.x - width / 2) / width) / t.k) == -forwardIndex) {
      newSinceDate = new Date(sinceDate.getTime() + duration * forwardIndex);
      newSinceDateString = formatTime(newSinceDate);

      newUntilDate = new Date(untilDate.getTime() + duration * forwardIndex);
      newUntilDateString = formatTime(newUntilDate);
      loadNewData(newSinceDateString, newUntilDateString);
      forwardIndex++;
    } else if (Math.floor(((t.x + width / 2) / width) / t.k) == backwardIndex) {
      newSinceDate = new Date(sinceDate.getTime() - duration * backwardIndex);
      newSinceDateString = formatTime(newSinceDate);

      newUntilDate = new Date(untilDate.getTime() - duration * backwardIndex);
      newUntilDateString = formatTime(newUntilDate);
      loadNewData(newSinceDateString, newUntilDateString);
      backwardIndex++;
    }
  }
};
