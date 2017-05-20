d3.ddtimelines = d3.ddtimelines || {};
d3.ddtimelines.spinner = function module(svg, settings) {
  var path;

  function exports() {
    var radius = Math.min(settings.width, settings.height) / 2;
    var tau = 2 * Math.PI;

    var arc = d3.arc()
      .innerRadius(radius*0.5)
      .outerRadius(radius*0.9)
      .startAngle(0);

    var container = svg.append("g")
      .attr("id", "spinner")
      .attr("width", settings.width)
      .attr("height", settings.height)
      .attr("transform", "translate(" + settings.containerWidth/2 + "," + settings.containerHeight/2 + ")");

    path = container.append("path")
      .datum({endAngle: 0.33*tau})
      .style("fill", "#4d4d4d")
      .attr("opacity", 0.7)
      .attr("d", arc);

    spin();
    setInterval(spin, 1000);

    function spin() {
      path.transition()
        .duration(1000)
        .ease(d3.easeLinear)
        .attrTween("transform", function() {
          return d3.interpolateString("rotate(0)", "rotate(360)");
        });
    }
  };

  exports.setVisible = function(visibility) {
    path.style("visibility", visibility);
  }

  return exports;
}
