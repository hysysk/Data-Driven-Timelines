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

  var pointChartRatio = settings.splitRatio ? settings.splitRatio[0] : 5;
  var durationChartRatio = settings.splitRatio ? settings.splitRatio[1] : 5;

  var pointChartHeight = height * pointChartRatio/10;
  var durationChartHeight = height * durationChartRatio/10;

  // set the ranges
  var x = d3.scaleTime().range([0, width]);
  var y0 = d3.scaleLinear().range([pointChartHeight, 0]);
  var y1 = d3.scaleLinear().range([pointChartHeight, 0]);

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
      return y0(d.value);
    });

  var barWidth;

  // define the timeline
  var timeline = d3.timeline()
    .size([width, durationChartHeight])
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
    .attr("class", "lineContainer0")
    .append("path")
    .attr("vector-effect", "non-scaling-stroke");

  var lineContainer2 = chartContainer.append("g")
    .attr("class", "lineContainer1")
    .append("path")
    .attr("vector-effect", "non-scaling-stroke");

  var lineContainers = [lineContainer, lineContainer2];

  var barContainer0 = chartContainer.append("g")
    .attr("class", "barContainer0");

  var barContainer1 = chartContainer.append("g")
    .attr("class", "barContainer1");

  var barContainers = [barContainer0, barContainer1];

  var timelineContainer = chartContainer.append("g")
    .attr("class", "timelines");

  var tracks = [];

  var overlayContainer = g.append("g")
    .attr("class", "overlayContainer");

  var toolTip = overlayContainer.append("g")
    .attr("class", "toolTip");

  var translateOffsetX = 0;
  var zoomScale = 1;
  var zoomMin = settings.zoom ? settings.zoom[0] : 1;
  var zoomMax = settings.zoom ? settings.zoom[1] : 16;

  var combination;

  // label
  var labelContainer = g.append("g")
    .attr("class", "labelContainer");

  var annotations = [];

  // Add the X Axis
  var axisX = d3.axisBottom(x)
    .tickSize(height);
  var groupX = g.append("g")
    .attr("class", "axisX")
    .call(axisX);

  groupX.append("g")
    .attr("transform", "translate(0," + pointChartHeight + ")")
    .call(d3.axisBottom(x))

  // Add the Y Axis
  var axisY0 = d3.axisLeft(y0);
  var groupY0 = g.append("g")
    .attr("class", "axisY")
    .call(axisY0);
  var axisY1 = d3.axisRight(y1);
  var groupY1;

  // UI
  var bisect = d3.bisector(function(d) {
    return d.at;
  }).left;

  // Zoom controller
  var zoom = d3.zoom()
    .scaleExtent([zoomMin, zoomMax])
    .on("zoom", onZoom);

  d3.select(settings.selector).append("div")
    .attr("class", "uiContainer");

  // Zoom button
  d3.select(".uiContainer").append("button")
    .classed("button_zoom", true)
    .attr("id", "zoom_in")
    .text("+")
    .on("click", onZoomClick);

    d3.select(".uiContainer").append("button")
      .classed("button_zoom", true)
      .attr("id", "zoom_out")
      .text("-")
      .on("click", onZoomClick);

  // Export button
  d3.select(".uiContainer").append("button")
    .classed("button_export", true)
    .attr("id", "export_svg")
    .text("SVG")
    .on("click", onExportClick);

  d3.select(".uiContainer").append("button")
    .classed("button_export", true)
    .attr("id", "export_png")
    .text("PNG")
    .on("click", onExportClick);


  d3.selectAll(".button_export").on("click", onExportClick);

  // Focus view
  toolTip.append("line")
    .attr("class", "focusLine")
    .attr("pointer-events", "none")
    .attr("vector-effect", "non-scaling-stroke");

  var labelMarginLeft = 8;

  var focusTime = toolTip.append("text")
    .attr("class", "time")
    .attr("pointer-events", "none");

  var focusPoints = [];
  var focusPointValues = [];
  var focusDurationValues = [];

  settings.timelines.forEach(function(tl) {
    if (tl.type == 'line' || tl.type == 'bar') {
      labelContainer.append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - pointChartHeight / 2)
        .attr("dy", "1em")
        .text(tl.labels[0]);

      focusPoints[0] = toolTip.append("circle")
        .attr("r", 3)
        .attr("class", "focusPoint0");

      focusPointValues[0] = toolTip.append("text")
        .attr("class", "point0")
        .attr("pointer-events", "none");

    } else if (tl.type == 'combo') {
      labelContainer.append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - pointChartHeight / 2)
        .attr("dy", "1em")
        .text(tl.labels[0]);

      labelContainer.append("text")
        .attr("class", "label")
        .attr("transform", "rotate(90)")
        .attr("text-anchor", "middle")
        .attr("x", pointChartHeight / 2)
        .attr("y", -width - margin.right)
        .attr("dy", "1em")
        .text(tl.labels[1]);

      focusPoints[0] = toolTip.append("circle")
        .attr("r", 3)
        .attr("class", "focusPoint0");

      focusPoints[1] = toolTip.append("circle")
        .attr("r", 3)
        .attr("class", "focusPoint1");

      focusPointValues[0] = toolTip.append("text")
        .attr("class", "point0")
        .attr("pointer-events", "none");

      focusPointValues[1] = toolTip.append("text")
        .attr("class", "point1")
        .attr("pointer-events", "none");

    } else if (tl.type == 'duration') {
      tl.labels.forEach(function(d, i) {
        labelContainer.append("text")
          .attr("class", "label")
          .text(d)
          .attr("y", pointChartHeight + margin.bottom + (i + 1) * 30 - 18)
          .attr("x", margin.left - 84);

        var label = toolTip.append("text").attr("class", "duration" + i)
          .attr("pointer-events", "none");
        focusDurationValues.push(label);
      })
    }
  });

  focusPointValues.forEach(function(value) {
    annotations.push(value);
  });
  annotations.push(focusTime);

  var focusRect = g.append("rect")
    .attr("class", "focus")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .call(zoom);

  focusRect.on("mousemove", onMouseMove);
  focusRect.on("mouseout", onMouseOut);
  focusRect.on("mouseover", onMouseOver);
  focusRect.on("click", onMouseClick);

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
    if(queries) {
      Object.keys(queries).forEach(function(key) {
        q += "&" + key + "=" + queries[key];
      });
    }
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
    y0.domain(d3.extent(dataset.points, function(d) {
      return +d.value;
    }));

    var bars = barContainer0.selectAll("rect")
      .data(dataset.points, function(d) {
        return d.at;
      });

    // enter
    if(!barWidth) {
      barWidth = width/dataset.points.length;
    }

    // update
    bars.enter()
      .append("rect")
      .attr("x", function(d) {
        return x(d.at) - barWidth / 2;
      })
      .attr("width", barWidth)
      .attr("y", function(d) {
        return y0(d.value);
      })
      .attr("height", function(d) {
        return pointChartHeight - y0(d.value);
      });

    // exit
    bars.exit().remove();

    groupX.call(axisX);
    groupY0.call(axisY0);
  }

  function showLine() {
    // Scale the range of the data
    x.domain([sinceDate, untilDate]);
    y0.domain(d3.extent(dataset.points, function(d) {
      return +d.value;
    }));

    lineContainer.data([dataset.points])
      .attr("class", "line")
      .attr("d", line);

    groupX.call(axisX);
    groupY0.call(axisY0);
  }

  function showCombo() {
    // Scale the range of the data
    x.domain([sinceDate, untilDate]);
    y0.domain(d3.extent(dataset.points, function(d) {
      return +d.value[0];
    }));
    y1.domain(d3.extent(dataset.points, function(d) {
      return +d.value[1];
    }));

    if (!groupY1) {
      groupY1 = g.append("g")
        .attr("class", "axisY")
        .attr("transform", "translate(" + width + ",0)")
        .call(axisY1);
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
                return y0(d.value[0]);
              } else if (index == 1) {
                return y1(d.value[1]);
              }
            })
          );
      } else if (type == "bar") {
        if(!barWidth) {
          barWidth = width/dataset.points.length;
        }

        var bars = barContainers[index]
          .selectAll("rect")
          .data(dataset.points, function(d) {
            return d.at;
          });

        // enter
        bars.enter()
          .append("rect")
          .attr("x", function(d) {
            return x(d.at) - barWidth / 2;
          })
          .attr("width", barWidth)
          .attr("y", function(d) {
            if (index == 0) {
              return y0(d.value[0]);
            } else if (index == 1) {
              return y1(d.value[1]);
            }
          })
          .attr("height", function(d) {
            if (index == 0) {
              return pointChartHeight - y0(d.value[0]);
            } else if (index == 1) {
              return pointChartHeight - y1(d.value[1]);
            }
          });

        // update
        bars.attr("y", function(d) {
            if (index == 0) {
              return y0(d.value[0]);
            } else if (index == 1) {
              return y1(d.value[1]);
            }
          })
          .attr("height", function(d) {
            if (index == 0) {
              return pointChartHeight - y0(d.value[0]);
            } else if (index == 1) {
              return pointChartHeight - y1(d.value[1]);
            }
          });

        // exit
        bars.exit().remove();
      }
    });

    groupX.call(axisX);
    groupY0.call(axisY0);
    groupY1.call(axisY1);
  }

  function showTimelines() {
    dataset.timelines.forEach(function(tl, i) {
      var timelineBands = timeline(tl);

      if (!tracks[i]) {
        tracks[i] = timelineContainer.append("g");
      }

      var rects = tracks[i].selectAll("rect")
        .data(timelineBands);

      rects.enter()
        .append("rect")
        .merge(rects)
        .attr("x", function(d) {
          return d.start;
        })
        .attr("y", function(d) {
          return pointChartHeight + margin.bottom + i * d.dy + i * 15;
        })
        .attr("height", function(d) {
          return d.dy;
        })
        .attr("width", function(d) {
          return d.end - d.start;
        })
        .attr("class", function(d) {
          return d.class;
        })
        .attr("url", function(d) {
          return d.url;
        });

      rects.exit().remove();
    });

    groupX.call(axisX);
  }

  function onMouseMove() {
    toolTip.attr("visibility", "visible");

    var transform = d3.zoomTransform(this);
    var xt = transform.rescaleX(x);
    var coords = d3.mouse(this);
    var posX = xt.invert(coords[0]);
    var arrayIndex = bisect(dataset.points, posX, 0, dataset.points.length);
    var smaller = dataset.points[arrayIndex - 1];
    var larger = dataset.points[arrayIndex];
    if (typeof smaller !== 'undefined' && typeof larger !== 'undefined') {
      var match = posX - smaller.at < larger.at - posX ? smaller : larger;

      focusPointValues[0].text(match.value[0])
        .attr("x", coords[0] + translateOffsetX + labelMarginLeft)
        .attr("y", y0(match.value[0]));

      focusPoints[0].attr("cx", coords[0] + translateOffsetX);
      focusPoints[0].attr("cy", y0(match.value[0]));

      if (focusPoints.length == 2) {
        focusPointValues[1].text(match.value[1])
          .attr("x", coords[0] + translateOffsetX + labelMarginLeft)
          .attr("y", y1(match.value[1]));

        focusPoints[1].attr("cx", coords[0] + translateOffsetX);
        focusPoints[1].attr("cy", y1(match.value[1]));
      }
    }

    dataset.timelines.forEach(function(timeline, index) {
      var isFocusOver = false;
      timeline.forEach(function(d, i) {
        if (coords[0] >= transform.applyX(x(parseTime(d.start_at))) && coords[0] <= transform.applyX(x(parseTime(d.end_at)))) {
          focusDurationValues[index].text(d.label)
            .attr("x", coords[0] + translateOffsetX + labelMarginLeft)
            .attr("y", pointChartHeight + index * 30 + 42);
          isFocusOver = true;
        } else {
          if (!isFocusOver) {
            focusDurationValues[index].text("");
          }
        }
      });
    });

    focusTime.text(formatTime(posX))
      .attr("x", coords[0] + translateOffsetX + labelMarginLeft)
      .attr("y", 14);

    toolTip.select(".focusLine")
      .attr("x1", coords[0] + translateOffsetX).attr('y1', 0)
      .attr("x2", coords[0] + translateOffsetX).attr('y2', height);

    relax();
  }

  function onMouseOver() {
    toolTip.attr("visibility", "visible");
  }

  function onMouseOut() {
    toolTip.attr("visibility", "hidden");
  }

  // This is a stupid way but zoom event conflicts with click event in this layer structure...
  function onMouseClick() {
    var coords = d3.mouse(this);
    var transform = d3.zoomTransform(this);
    var rects = chartContainer.selectAll(".timelines rect").nodes();
    rects.forEach(function(rect) {
      var r = d3.select(rect);
      var left = transform.applyX((parseInt(r.attr("x"))));
      var right = transform.applyX(parseInt(r.attr("x")) + parseInt(r.attr("width")));
      var top = parseInt(r.attr("y"));
      var bottom = top + parseInt(r.attr("height"));
      var url = r.attr("url");

      if(coords[0] >= left && coords[0] <= right && coords[1] >= top && coords[1] <= bottom) {
        window.open(url);
      }
    })
  }

  function relax() {
    var again = false;
    annotations.forEach(function(a, i) {
      annotations.slice(i+1).forEach(function(b, j) {
        if(a == b) return;

        var bboxA = a.node().getBBox();
        var bboxB = b.node().getBBox();

        var topA = bboxA.y;
        var bottomA = bboxA.y + bboxA.height;
        var leftA = bboxA.x;
        var rightA = bboxA.x + bboxA.width;

        var topB = bboxB.y;
        var bottomB = bboxB.y + bboxB.height;
        var leftB = bboxB.x;
        var rightB = bboxB.x + bboxB.width;

        var collideH = leftA < rightB && rightA > leftB;
        var collideV = topA < bottomB && bottomA > topB;

        if(collideH && collideV) {
          again = true;
          a.attr("y", +a.attr("y") + 0.5);
          b.attr("y", +b.attr("y") - 0.5);
        }
      });
    });
    if(again) setTimeout(relax, 30);
  }

  function onExportClick() {
    var doctype = '<?xml version="1.0" standalone="no"?>' +
      '<?xml-stylesheet href="ddtimelines.css" type="text/css"?>' +
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';

    var svgDomElement = d3.select('svg').node();

    generateStyleDefs(svgDomElement);

    // serialize our SVG XML to a string.
    var source = (new XMLSerializer()).serializeToString(svgDomElement);

    if (d3.event.target.id == "export_png") {
      var dataUri = "data:image/svg+xml;utf8," + encodeURIComponent(source);
      var canvas = d3.select("body").append("canvas")
        .attr("id", "drawing")
        .attr("width", size[0])
        .attr("height", size[1])
        .style("display", "none");

      var context = canvas.node().getContext("2d");
      var img = new Image();
      img.src = dataUri;

      img.onload = function() {
        context.drawImage(img, 0, 0);
        var dataUrl = canvas.node().toDataURL("image/png");
        download(dataUrl, "ddtimelines.png");
      };
    } else if (d3.event.target.id == "export_svg") {
      var blob = new Blob([doctype + source], {
        type: "image/svg+xml;charset=utf-8"
      });
      var url = window.URL.createObjectURL(blob);
      download(url, "ddtimelines.svg");
    }
  }

  function download(url, fileName) {
    var a = d3.select("body").append("a");
    a.attr("class", "downloadLink")
      .attr("download", fileName)
      .attr("href", url)
      .text("test")
      .style("display", "none");
    a.node().click();
    setTimeout(function() {
      window.URL.revokeObjectURL(url);
      a.remove();
    }, 10);
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

    translateOffsetX = -t.x;
    zoomScale = t.k;

    chartContainer.attr("transform", "translate(" + t.x + ",0) scale(" + zoomScale + ",1)");
    overlayContainer.attr("transform", "translate(" + t.x + ",0) scale(" + zoomScale + ",1)");
    toolTip.attr("transform", "scale(" + 1/zoomScale + ",1)").attr("visibility", "hidden");
    groupX.call(axisX.scale(t.rescaleX(x)));

    if(settings.loadDataFromFile)
      return;

    // load new data when scroll reaches 20%
    var newSinceDate, newUntilDate, newSinceDateString, newUntilDateString;
    if (Math.ceil(((t.x - width * 0.8) / width) / t.k) == -forwardIndex) {
      newSinceDate = new Date(sinceDate.getTime() + duration * forwardIndex);
      newSinceDateString = formatTime(newSinceDate);

      newUntilDate = new Date(untilDate.getTime() + duration * forwardIndex);
      newUntilDateString = formatTime(newUntilDate);
      loadNewData(newSinceDateString, newUntilDateString);
      forwardIndex++;
    } else if (Math.floor(((t.x + width * 0.8) / width) / t.k) == backwardIndex) {
      newSinceDate = new Date(sinceDate.getTime() - duration * backwardIndex);
      newSinceDateString = formatTime(newSinceDate);

      newUntilDate = new Date(untilDate.getTime() - duration * backwardIndex);
      newUntilDateString = formatTime(newUntilDate);
      loadNewData(newSinceDateString, newUntilDateString);
      backwardIndex++;
    }
  }
};
