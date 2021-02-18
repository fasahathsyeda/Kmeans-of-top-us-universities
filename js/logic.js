// From http://stackoverflow.com/questions/14167863/how-can-i-bring-a-circle-to-the-front-with-d3
      // Solves the issue of bringing an element to the front
      d3.selection.prototype.moveToFront = function() {
        return this.each(function() {
          this.parentNode.appendChild(this);
        });
      }

      // From http://stackoverflow.com/questions/14167863/how-can-i-bring-a-circle-to-the-front-with-d3
      // Solves the issue of moving an element to the back
      d3.selection.prototype.moveToBack = function() {
          return this.each(function() {
              var firstChild = this.parentNode.firstChild;
              if (firstChild) {
                  this.parentNode.insertBefore(this, firstChild);
              }
          });
      };


      // Map guide used:
      // https://bl.ocks.org/mbostock/4090848

      /* ALL THE VARIABLES WE NEED TO TRACK GLOBALLY */

      // Assign dimensions of SVG element
      var width = 1300;
      var height = 610;

      // Colors
      var DARK_BLUE = "#003d66";
      var LIGHT_BLUE = "#80ccff";
      var YELLOW = "#e6e600";
      var RED = "red";
      var GRAY = "#999999";

      // Global list of university JSONs
      var uniJSONs;

      // Selected parameters to cluster by
      var selectedParms = [];

      // Selected states to include universities to cluster
      var selectedStates = [];

      // Set the projection, based on the fact that we're using a US map
      var projection = d3.geo.albersUsa().scale(1130).translate([width / 2, height / 2]);

      // Set the path based on this projection
      var path = d3.geo.path().projection(projection);

      // SVG element
      var svg = d3.select("#mapSVG");


      // Map radii for various situations
      var defCircleR = 3;
      var largeCircleR = 10;



      // xScale + yScale
      var xScale;
      var yScale;

      // Axes
      var xAxis;
      var yAxis;

      // Overall data for clustering
      var overAllData = [];

      // To refer to types of data via selected clustering categories
      var DATA_MAPPINGS = {
                  "score_info" : "mean_sat_score",
                  "admissions_info" : "acceptance_rate",
                  "salary_info" : "mid_career_median_salary"
                }


      // To refer to the titles of the generated graphs
      var TITLE_MAPPINGS   =   {
                    "mean_sat_score" : "SAT Score",
                    "acceptance_rate" : "Acceptance Rate (%)",
                    "mid_career_median_salary" : "Median Mid-Career Salary ($)"
                   }


      // The container SVG for the cluster graph
      var clusterSVG;


      // Where the SVG goes for the clustering
      var cSVG;


      // Dimensions of the clustering graph
      var clusterHeight = 450;
      var clusterWidth = 450;
      var padding = 60;

      // Offsets for the clustering graph
      var xGraphOffset = 1058;
      var yGraphOffset = 30;



      // Cluster circles

      var clusterCircleSize = 5;
      var clusterCircleExpanded = 9;

      // Data for cluster line
      var clusterLines = [];

      // Line SVG elements
      var thaLines;



      // Popover d values
      var popOverD = "M2.84217094e-14,15.0033286 C2.84217094e-14,6.71721901 6.72196489,0 14.9984654,0 L145.001535,0 C153.284958,0 160,6.71386735 160,15.0033286 L160,81.0179743 C160,89.3040839 153.293616,95.8257794 145.008705,95.615906 C145.008705,95.615906 103.12327,94.1943408 95.8076299,96.0213029 C86.4716462,98.3528128 80,116 80,116 C80,116 72.9323922,98.2840499 63.8717532,96.0213029 C56.280768,94.125578 14.998882,95.5969452 14.998882,95.5969452 C6.71522822,95.8313115 2.84217094e-14,89.3074356 2.84217094e-14,81.0179743 L2.84217094e-14,15.0033286 Z";


      // Dimensions of the popover
      var POWidth = 160;
      var POHeight = 116;


      /* END OF GLOBAL VARIABLE INIT */


      // Cluster dot mouseover callback function
      function mouseOverCallback (d, selectedElmt) {

        var circ = selectedElmt;
        console.log(d)
        console.log(selectedElmt);
        circ.transition().attr("r", clusterCircleExpanded).style("fill", "white");
        circ.moveToFront();
                cSVG.selectAll(".clusterDot").moveToFront();
        // Select map elements
        var skool = d["school"];
        console.log(skool);
        var mapElements = d3.selectAll(".map-circle").filter(function (d) {
          return d["school"] == skool;
        });

        // Reset and move to front
        mapElements.transition().attr("r", largeCircleR);
        mapElements.moveToFront();

             // Label at the top w/info
        d3.select("#univName").text(d["school"]);
        d3.select("#univInfo").text("SAT Score: " + d["score_info"]["mean_sat_score"] + " | Admission Rate: "+d["admissions_info"]["acceptance_rate"]+"% | Median Mid-career Salary: $"+d["salary_info"]["mid_career_median_salary"]);

      }



      // Cluster dot mouseleave callback function
       function mouseLeaveCallback (d, selectedElmt) {

        var circ = selectedElmt;
        circ.transition().attr("r", clusterCircleSize).style("fill", DARK_BLUE);
        circ.moveToBack();

        // Get the lines that apply to this clusterId + move them to back
        var clusterId = selectedElmt.data()[0]["clusterId"]
        d3.selectAll(".cluster-line").filter(function (d) {
          return d["clusterId"] == clusterId;
        }).moveToBack();


        // Select map elements
        var skool = d["school"];
        var mapElements = d3.selectAll(".map-circle").filter(function (d) {
          return d["school"] == skool;
        });

        // Reset and move to back
        mapElements.transition().attr("r", defCircleR);



        // Reset top label
        d3.select("#univName").text("Interactive: hover over any circle on map or graph");
        d3.select("#univInfo").text("");

       }


       // Universal cluster line adding function
       function addClusterLines (newClusters, svg) {
        // Accumulate dot - cluster associations
        clusterLines = [];
        newClusters.each(function (d) {
          console.log(d);
          // Get all the cluster-circles w/appropriate clusterId
          var clusterId = d["id"];
          var assocCircles = svg.selectAll(".cluster-circle").filter(function (f) {
            return f["clusterId"] == clusterId;
          });

          assocCircles.each(function (n) {
            var lineJSON = { x1: n["cx"], y1: n["cy"], x2: d["cx"], y2: d["cy"], clusterId: clusterId }
            clusterLines.push(lineJSON);
          });
        });

        // Move the lines to the back of the display
        var lineSVGs = svg.selectAll(".cluster-line")
                  .data(clusterLines).enter()
                .append("line")
                  .attr("x1", function (d) { return d.x1; })
                  .attr("y1", function (d) { return d.y1; })
                  .attr("x2", function (d) { return d.x2; })
                  .attr("y2", function (d) { return d.y2; })
                  .attr("class", "cluster-line")
                  .style("opacity", 0)
                  .style("stroke", LIGHT_BLUE)
                  .style("stroke-width", 0.5)
        lineSVGs.transition().duration(1000).style("opacity", 1.0);
        return lineSVGs;
       }


       // Entering the centroid
       function clusterMouseOver (d) {
        //highlight circles in same cluster **AA**
        var cId = d["id"];
        console.log(cId);
        var skools=[];
        var aCircles = svg.selectAll(".cluster-circle")
              .filter(function (f) {
                if (f["clusterId"] == cId){
                  skools.push(f["school"]);
                  return true;
                } else {
                  return false;
                }
              });
        aCircles.transition().attr("r", clusterCircleExpanded).style("fill", "white");
        skools.forEach(function (s) {
             var mElements = d3.selectAll(".map-circle").filter(function (d) { return d["school"] == s; });
                  // Reset and move to back
             mElements.transition().attr("r", largeCircleR);
            mElements.moveToFront();
          });
       }


       // Leaving the centroid
       function clusterMouseLeave (d) {
        //highlight circles in same cluster **AA**
        var cId = d["id"];
        var skools=[];
        var aCircles = svg.selectAll(".cluster-circle").filter(function (f) {
              if (f["clusterId"] == cId) {
                skools.push(f["school"]);
                return true;
              } else {
                return false;
              }
            });

        aCircles.transition().attr("r", clusterCircleSize).style("fill", DARK_BLUE);
        skools.forEach(function (s) {
            var mElements = d3.selectAll(".map-circle").filter(function (d) { return d["school"] == s; });
                  // Reset and move to back
            mElements.transition().attr("r", defCircleR);
        });
       }





      // load the map JSON
      d3.json("js/us-states.json", function(error, json) {

        if (error) throw error;

        svg.selectAll("path")
          .data(json.features)
          .enter()
          .append("path")
          .attr("d", path)
          .attr("class", "state")
          .on("mouseover", function (d) {

            // Only reset non-selected states
            var nonSelectedStates = d3.selectAll(".state").filter(function (d) {
              console.log(d);
              var inArray = false
              selectedStates.forEach( function (s) {
                console.log(s);
                inArray = inArray || (d["properties"]["name"] == s)
              });
              return !inArray
            }).style("fill", LIGHT_BLUE); // Set all equal to this color

            // Make the state that we're hovering over YELLOW
            d3.select(this).style("fill", YELLOW);

            // Only move these back to original color if they're not part of the highlights / select state groupings
            var nonSelectedMapCircles = d3.selectAll(".map-circle")
                            .filter(function (d) {
                              var inArray = false;
                              //console.log(selectedStates);
                              selectedStates.forEach(function (s) {
                                inArray = inArray || (s == d["location_info"]["state"]);
                              });
                              return !inArray;
                            }).style("fill", DARK_BLUE).style("stroke", "white");

          })
          .on("click", function (d) {
            console.log(d);
            // Get the selected SVG element
            var s = d3.select(this);

            // Get the state name
            var state = d["properties"]["name"]

            // Check to see if this state is already in the array
            var ind = selectedStates.indexOf(state);

            // If this state is not in the array
            if (ind == -1) {
              // Add it to the array
              selectedStates.push(state);
              // Make the fill YELLOW
              s.style("fill", YELLOW);
              // Find the circles we need to highlight
              var relevantCircles = d3.selectAll(".map-circle")
                          .filter(function (d) {
                            // Find the state
                            var circleState = d["location_info"]["state"];
                            console.log(circleState);
                            circleState = circleState == "District of Columbia" ? "Maryland" : circleState;
                            return circleState == state;
                          });
              relevantCircles.style("stroke", LIGHT_BLUE).style("fill", "white");
            } else {
              selectedStates.splice(ind, 1); // Remove that state
              s.style("fill", LIGHT_BLUE);
              d3.selectAll(".map-circle").filter(function (e) {
                return e["location_info"]["state"] == state;
              }).style("fill", DARK_BLUE).style("stroke", "white");
            }


          }).on("mouseleave", function (d) {
            // Get the state name
            var state = d["properties"]["name"]

            // Check to see if this state is already in the array
            var inArray = false;
            selectedStates.forEach(function (e) {
              inArray = inArray || (state == e);
            });

            // If not in array, make the fill light purple again (b/c mouse out)
            if (!inArray) {
              d3.select(this).style("fill", LIGHT_BLUE);
            }

            // Control highlighting well
            var appropMapCircles = d3.selectAll(".map-circle").filter(function (d) {
              var inArray = false;
              selectedStates.forEach(function (e) {
                inArray = inArray || (d["location_info"]["state"] == e);
              });
              return !inArray
            });

            appropMapCircles.style("fill", DARK_BLUE).style("stroke", "white");

          });

      });





      // load the universities

      d3.json('UNIVERSITIES.json', function(error, data) {
        // Mapping inspiration taken from
        // http://chimera.labs.oreilly.com/books/1230000000345/ch12.html#_adding_points


        // Set the data of the universities equal to the global variable tracking it
        uniJSONs = data;
        console.log(uniJSONs);

        // Add field `mean_sat_score` to `score_info` section
        for (var i = 0; i < data.length; i++) {
          var meanSATScore = (data[i]["score_info"]["SAT Upper"] + data[i]["score_info"]["SAT Lower"]) / 2;
          
          //var meanSATScore = meanMathSATScore + meanReadingSATScore;
          data[i]["score_info"]["mean_sat_score"] = meanSATScore;
        }

        //circles
        svg.selectAll("circle")
          .data(data)
          .enter()
          .append("circle")
          .attr("cx", function(d) {
            var lat = d["location_info"]["lat"];
            var lng = d["location_info"]["lng"];
            return projection([lng, lat])[0];
          })
          .attr("cy", function(d) {
            var lat = d["location_info"]["lat"];
            var lng = d["location_info"]["lng"];
            return projection([lng, lat])[1];
          })
          .attr("r", defCircleR)
          .attr("data", function(d) {
            return data.indexOf(d); // Return the index of the data we care about
          })
          .attr("class", "map-circle")
          .style("fill", DARK_BLUE).style({'cursor':'pointer'})
          .on("mouseover", function(d) {

            // On hover of a circle in a particular state, highlight that state
            var circleState = d["location_info"]["state"]
            d3.selectAll(".state").filter(function (d) {
              return d["properties"]["name"] == circleState;
            }).style("fill", YELLOW);


            // Highlight relevant circles
            var sel = d3.select(this);
            sel.moveToFront();
            sel.transition().duration(500).attr("r", largeCircleR);


                     // Highlight relevant cluster on the cluster graph (if it exists) + move to front
                     var circleSchool = d["school"];
                     var corrCluster = d3.selectAll(".cluster-circle").filter(function (d) {
                       return d["school"] == circleSchool;
                     });
                     corrCluster.transition().duration(500).attr("r", clusterCircleExpanded).style("fill", "white");
                     corrCluster.moveToFront();



                     // Label at the top
            d3.select("#univName").text(d["school"]);
            d3.select("#univInfo").text("SAT Score: " + d["score_info"]["mean_sat_score"] + " | Admissions Rate: "+d["admissions_info"]["acceptance_rate"]+"% | Median Mid-career Salary: $"+d["salary_info"]["mid_career_median_salary"]);


          })
          .on("mouseleave", function(d) {

            // Reset radius
            d3.select(this).transition().duration(500).attr("r", defCircleR);

                     // Reset cluster circle + move to back
                     var circleSchool = d["school"];
                     var corrCluster = d3.selectAll(".cluster-circle").filter(function (d) {
                       return d["school"] == circleSchool;
                     });
                     corrCluster.transition().duration(500).attr("r", clusterCircleSize).style("fill", DARK_BLUE);
                     corrCluster.moveToBack();



            d3.select("#univName").text("Interactive: hover over any circle on map or graph");
            d3.select("#univInfo").text("");
                    })



        /* ALL CLUSTERING SVG (ON INIT OF THE VIEW) */



        // cluster SVG container w/proper margins
        clusterSVG = svg.append("g")
                  .attr("class", "clustering")
                  .attr("height", function () { return clusterHeight + 2*padding; })
                  .attr("width", function () { return clusterWidth + 2*padding; })
                  .attr("transform", "translate(" + xGraphOffset+ "," + yGraphOffset + ")");



        // Init the title of the graph
        clusterSVG.append("text")
                .attr("class", "cluster-title")
                .attr("x", clusterWidth/2+padding)
                .attr("y", padding/2)
                .attr("alignment-baselines", "middle")
                .attr("text-anchor", "middle")
                .style("fill", DARK_BLUE)
                .style("font-size", 16)
                .text("Acceptance Rate (%) vs. SAT Score")


        // X-Axis Label
        clusterSVG.append("text")
          .attr("class", "x-label")
          .attr("x", clusterWidth/2 + padding)
          .attr("y", clusterHeight + padding + padding/2)
          .style("text-anchor", "middle")
          .text("SAT Score");


        // Y-Axis Label
        clusterSVG.append("text")
          .attr("class", "y-label")
          .attr("transform", "rotate(-90)")
          .attr("y", 15)
          .attr("x", -clusterHeight/2 - padding)
          .attr("dy", ".71em")
          .style("text-anchor", "middle")
          .text("Acceptance Rate (%)")


        // SVG with proper dimensions
        cSVG = clusterSVG.append("g")
                    .attr("class", "graph")
                    .attr("height", function () { return clusterHeight; })
                    .attr("width", function () { return clusterWidth; })
                    .attr("transform", "translate(" + padding + "," + padding +")");

        // Scaling functions
        xScale = d3.scale.linear().range([0, clusterWidth]);
        yScale = d3.scale.linear().range([clusterHeight, 0]);

        // Axes
        xAxis = d3.svg.axis().scale(xScale).orient("bottom");
        yAxis = d3.svg.axis().scale(yScale).orient("left");

        // Scaling of the original clustering

        // SAT score on x-axis
        xScale.domain(d3.extent(uniJSONs, function (d) {
          return d["score_info"]["mean_sat_score"];
        })).nice();

        // Admissions rate on the y-axis
        yScale.domain(d3.extent(uniJSONs, function (d) {
          return d["admissions_info"]["acceptance_rate"];
        })).nice();


        // Axes setup is based off https://bl.ocks.org/mbostock/3887118 example

        // x-axis
        cSVG.append("g")
          .attr("class", "x axis")
          .style("stroke", DARK_BLUE)
          .attr("transform", "translate(0," + clusterHeight + ")")
          .call(xAxis);

        // y-axis
        cSVG.append("g")
          .attr("class", "y axis")
          .style("stroke", DARK_BLUE)
          .call(yAxis);



        // Modify the graph text styling
        cSVG.selectAll(".axis text")
          .attr("class", "graph-text");


        // k-means cluster this info
        var clusterResult = kMeansCluster(uniJSONs, 4,
                    "score_info", "mean_sat_score",
                    "admissions_info", "acceptance_rate")
        predict(clusterResult,"score_info","mean_sat_score","admissions_info","acceptance_rate");


        // Add university dots
        console.log(clusterResult);
        var clusterCircs = cSVG.selectAll("circle")
          .data(clusterResult[0]).enter()
        .append("circle")
          .attr("r", clusterCircleSize)
          .attr("cx", function (d) { return xScale(d["score_info"]["mean_sat_score"]); })
          .attr("cy", function (d) { return yScale(d["admissions_info"]["acceptance_rate"]); })
          .attr("class", "cluster-circle")
          .style("fill", DARK_BLUE)
          .style("stroke", LIGHT_BLUE)
        .on("mouseover", function (d) {
          mouseOverCallback(d, d3.select(this));
        })
        .on("mouseleave", function (d) {
          mouseLeaveCallback(d, d3.select(this));
        });

        // Accumulate this info for lines
        clusterCircs.each(function (d) {
          d["cx"] = d3.select(this).attr("cx");
          d["cy"] = d3.select(this).attr("cy");
        });


        // add cluster dots
        var newClusters = cSVG.selectAll(".clusterDot")
          .data(clusterResult[1]).enter()
        .append("circle")
          .attr("r", 3)
          .attr("class", "clusterDot")
          .attr("cx", function (d) { return xScale(d["score_info"]["mean_sat_score"]); })
          .attr("cy", function (d) { return yScale(d["admissions_info"]["acceptance_rate"]); })
          .style("fill", RED)
          .style("stroke", RED)
          .on("mouseover", function (d){

            clusterMouseOver(d);

          })
          .on("mouseleave",function (d) {

            clusterMouseLeave(d);

          });

        // Accumulate this info for lines
        newClusters.each(function (d) {
          d["cx"] = d3.select(this).attr("cx");
          d["cy"] = d3.select(this).attr("cy");
        });


        // Add appropriate lines
        thaLines = addClusterLines(newClusters, cSVG);
        thaLines.moveToBack();

        /* END OF CLUSTERING INIT */








        /* LINEAR REGRESSION GRAPHS */


        // Linear regression pairings
        var pairings =   [
                  ["score_info", "admissions_info", "a"],
                  ["salary_info", "score_info", "b"],
                  ["admissions_info", "salary_info", "c"]
                ]

        // To refer to linear regression axes
        var axes_map =   {
                  "mean_sat_score" : "SAT Score",
                  "acceptance_rate" : "Acceptance Rate (%)",
                  "mid_career_median_salary" : "Median Mid-Career Salary (Thousands $)"
                }


        // Dimensions for each graph
        var lgWidth = 380;
        var lgHeight = 380;
        var lgPadding = 60;


        // Axes scales
        var lgX = d3.scale.linear().range([0, lgWidth]);
        var lgY = d3.scale.linear().range([lgHeight, 0]);


        // Axes functions
        var lgXAxis = d3.svg.axis()
                .scale(lgX)
                .tickFormat(function (d) {
                  return d > 10000 ? d/1000.0 : d;
                })
                .orient('bottom');

        var lgYAxis = d3.svg.axis()
                .scale(lgY)
                .tickFormat(function (d) {
                  return d > 10000 ? d/1000.0 : d;
                })
                .orient('left');


        // The offset of each graph per iteration
        var xOffset = 450;


        // The current value of x for the first graph
        var xTrack = 200;

        // This is where we do our work
        pairings.forEach(function (d) {

          // Set up the SVG
          var lgSVGContainer = d3.select("#linRegSVG")
                      .append("g")
                      .attr("width", lgWidth+2*lgPadding)
                      .attr("height", lgHeight+2*lgPadding)
                      .attr("transform", "translate(" + xTrack + ", 60)")

          var lgSVG = lgSVGContainer.append("g")
                    .attr("transform", "translate(" + lgPadding + "," + lgPadding + ")");


          // Each type of data is namespaced in the uniJSONs array, so obtain these from the array above
          var xNameSpace = d[0];
          var yNameSpace = d[1];

          // Label for the dot classes
          var dotClass = "lin-reg-dot-" + d[2];

          // Obtain the names of the actual data values under these namespaces
          var xInfo = DATA_MAPPINGS[xNameSpace];
          var yInfo = DATA_MAPPINGS[yNameSpace];

          // xExtent
          var xExtent = d3.extent(uniJSONs, function (d) {
            return d[xNameSpace][xInfo];
          });

          // yExtent
          var yExtent = d3.extent(uniJSONs, function (d) {
            return d[yNameSpace][yInfo];
          });

          // Set the domains for the scales according to the data values
          lgX.domain(xExtent).nice();
          lgY.domain(yExtent).nice();

          // Add the x and y axis to the view
          // x-axis function
          lgSVG.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + lgHeight + ")")
            .style("stroke", DARK_BLUE)
            .call(lgXAxis);

          // y-axis function
          lgSVG.append("g")
            .attr("class", "y axis")
            .style("stroke", DARK_BLUE)
            .call(lgYAxis);

          // Modify the graph text styling
          lgSVG.selectAll(".axis text")
            .attr("class", "graph-text");
            xTrack += xOffset


          // Init the title of the graph
          lgSVGContainer.append("text")
              .attr("class", "reg-title")
              .attr("x", lgWidth/2+lgPadding)
              .attr("y", 10)
              .attr("alignment-baselines", "middle")
              .attr("text-anchor", "middle")
              .style("fill", DARK_BLUE)
              .style("font-size", 13)
              .text(function() {
                var yTitle = axes_map[yInfo];
                var xTitle = axes_map[xInfo];
                return yTitle + " vs. " + xTitle;
              })


          // X-Axis Label
          lgSVGContainer.append("text")
            .attr("class", "x-label")
            .attr("x", lgWidth/2 + lgPadding)
            .attr("y", lgHeight + lgPadding + lgPadding/2)
            .style("text-anchor", "middle")
            .text(axes_map[xInfo]);


          // Y-Axis Label
          lgSVGContainer.append("text")
            .attr("class", "y-label")
            .attr("transform", "rotate(-90)")
            .attr("y", 20)
            .attr("x", -lgHeight/2 - lgPadding)
            .attr("dy", ".71em")
            .style("text-anchor", "middle")
            .text(axes_map[yInfo]);


          // Add dots
          lgSVG.selectAll(".lingRegDot")
            .data(uniJSONs).enter()
          .append("circle")
            .style("stroke", LIGHT_BLUE)
            .style("fill", DARK_BLUE)
            .attr("class", dotClass)
            .attr("r", 4.5)
            .attr("cx", function (d) {
              return lgX(d[xNameSpace][xInfo])
            })
            .attr("cy", function (d) {
              return lgY(d[yNameSpace][yInfo])
            })


          // Perform linear regression + obtain B1 and B0 coefficients
          var linRegResult = linearRegression(uniJSONs, xNameSpace, xInfo, yNameSpace,
                            yInfo);
          var B1 = linRegResult[0];
          var B0 = linRegResult[1];
          console.log(B1);
          console.log("y="+B1+"x+"+B0);

          // Get boundary x-values (raw, unscaled)
          console.log(xExtent)
          var x1 = xExtent[0];
          var x2 = xExtent[1];

          // Perform line computation to get y's (raw, unscaled)
          var y1 = B1 * x1 + B0;
          var y2 = B1 * x2 + B0;

          // Add the line to the graph + ensure it's in the front
          // Ensure scaling of x1, y1, x2, y2
          var linRegLine = lgSVG.append("line")
                      .attr("x1", lgX(x1)).attr("y1", lgY(y1))
                      .attr("x2", lgX(x2)).attr("y2", lgY(y2))
                      .attr("class", "lin-reg-line")
                      .style("opacity", 1)
                      .style("stroke", YELLOW)
                      .style("stroke-width", 3);
          linRegLine.moveToFront();

          // AESTHETIC CHANGES + INTERACTION

          // Grab all the coefficients
          coefficients = [];
          d3.selectAll("." + dotClass).each(function (d) {
            // Get raw x + y values
            var xValue = d[xNameSpace][xInfo];
            var yValue = d[yNameSpace][yInfo];

            // Find the y-value given the raw line parameters
            var lineY = B1 * xValue + B0;
            //console.log(lineY);

            // Get the overall y-diff
            var overallYDiff = Math.abs(yExtent[1] - yExtent[0]);

            // Get the point - line difference (absolute value)
            var pointYDiff = Math.abs(yValue-lineY);

            var coeff = pointYDiff.toFixed(5) / overallYDiff.toFixed(5);

            coefficients.push(coeff);

          });


          // Compute the max coefficient
          var maxCoeff = d3.max(coefficients);


          // Opacity mods + mouseover interaction
          var linRegDots = d3.selectAll("." + dotClass)
          .attr("opacity", function (d) {

            // Get raw x + y values
            var xValue = d[xNameSpace][xInfo];
            var yValue = d[yNameSpace][yInfo];

            // Find the y-value given the raw line parameters
            var lineY = B1 * xValue + B0;

            // Get the overall y-diff
            var overallYDiff = Math.abs(yExtent[1] - yExtent[0]);

            // Get the point - line difference (absolute value)
            var pointYDiff = Math.abs(yValue-lineY);

            // Get this coefficient
            var coeff = pointYDiff.toFixed(5) / overallYDiff.toFixed(5);

            // compute the proper opacity, given the relative maxiumum
            if (coeff < maxCoeff * 0.25) {
              return 0.25;
            } else if (coeff < maxCoeff * 0.5) {
              return 0.5;
            } else if (coeff < maxCoeff * 0.75) {
              return 0.75;
            } else {
              return 1.0;
            }

          })
          .on("mouseover", function (d) {

            var myDot = d3.select(this);

            var cx = parseFloat(myDot.attr("cx"));
            var cy= parseFloat(myDot.attr("cy"));

            var xTrans =  cx + lgPadding - POWidth/2;
            var yTrans = cy + lgPadding - POHeight - 7;

            // Where to add the popover (above the dot slightly )

            // Remove all like this currently
            d3.selectAll("g .pop-over").remove();

            // Append the SVG element
            var popContainer = lgSVGContainer.append("g")
                      .attr("transform", "translate(" + xTrans + "," + yTrans + ")")

            var pop = popContainer.append("path")
              .attr("d", popOverD)
              .attr("class", "pop-over")
              .attr("stroke", "green")
              .attr("fill", "white")
              .style("opacity", 1.0)

              .on("mouseleave", function (d) {
                d3.select(this).remove();
              });
              // console.log(pop);
            lgSVGContainer.moveToBack();
            pop.moveToFront();


          // ADD TEXT TO THE POPOVER



          var size = d["school"].split(" ").length;
          var yOff = 20;


          var title = popContainer.append("text")
            .attr("class", "pop-over")
            .attr("x", POWidth/2)
            .attr("y", yOff)
            .attr("alignment-baselines", "middle")
            .attr("text-anchor", "middle")
            .style("fill", "black")
            .style("opacity", 1.0)
            .style("font-size", function () {
              if (size < 3) {
                return 10;
              } else if (size < 4) {
                return 9;
              } else if (size < 6) {
                return 8;
              } else {
                return 6;
              }
            })
            .text(d["school"]);
          title.moveToFront();

          // get info to display
          var xVal = d[xNameSpace][xInfo];
          var yVal = d[yNameSpace][yInfo];;

          // Present the xParm
          var xParm = popContainer.append("text")
            .attr("class", "pop-over")
            .attr("x", POWidth/2)
            .attr("y", yOff*2)
            .attr("alignment-baselines", "middle")
            .attr("text-anchor", "middle")
            .style("fill", "black")
            .style("font-size", 8)
            .text(function () {
              return TITLE_MAPPINGS[xInfo] + ": " + xVal;
            });

          // Present the yParm
          var yParm = popContainer.append("text")
            .attr("class", "pop-over")
            .attr("x", POWidth/2)
            .attr("y", yOff*3)
            .attr("alignment-baselines", "middle")
            .attr("text-anchor", "middle")
            .style("font-size", 8)
            .text(function () {
              return TITLE_MAPPINGS[yInfo] + ": " + yVal;
            })


         


          })
          .on("mouseleave", function (d) {
            d3.selectAll("g .pop-over").remove();
          });


        });


        /* END OF LINEAR REGRESSION GRAPHS */


      });


      // Basic color fade-in on load up for map
      $(document).ready(function() {
        // Set to 0 initially
        $('svg').css("fill-opacity", "0");
        // Animate it in
        $('svg').animate({
          "fill-opacity": "1.0"
        }, 1000, function() {});

      });


      // Select all states button
      $(".all-state-btn").on("click", function (e) {
        // Add these appropriate states to the array if they are not already there
        d3.selectAll(".state").each(function (d) {
          var stateElmt = d3.select(this);
          var ind = selectedStates.indexOf(d["properties"]["name"]);
          if (ind == -1) {
            selectedStates.push(d["properties"]["name"]);
          }
          stateElmt.style("fill", YELLOW);
        });

        // Highlight all map circles
        d3.selectAll(".map-circle").style("fill", "white").style("stroke", LIGHT_BLUE);


      });



      // Clustering parameter selection
      $(".cluster-btn").on("click", function (e) {
        // Push this on if it's not in the array already
        var inArray = false;
        var s = $(this);
        selectedParms.forEach(function (d) {
          inArray = inArray || (d.attr("data") == s.attr("data"))
        });
        if (!inArray) {
          selectedParms.push($(this));
          $(this).css("background", YELLOW);
          if (selectedParms.length > 2) {
            var removedButton = selectedParms.splice(0, 1)[0]; // Remove the first element
            removedButton.css("background", LIGHT_BLUE);
          }
        }
      });


      // Reset the view
      $(".reset-btn").on("click", function (e) {
        // Empty these
        selectedParms = [];
        selectedStates = [];

        // Reset all map circles
        d3.selectAll(".map-circle").style("fill", DARK_BLUE).style("stroke", "white");

        // Reset all states
        d3.selectAll(".state").style("fill", LIGHT_BLUE);

        // Remove the clusters + dots + lines
        d3.selectAll(".clusterDot").remove();
        d3.selectAll(".cluster-circle").remove();
        d3.selectAll(".cluster-line").remove();

        // Reset the button colors
        $(".cluster-btn").css("background", LIGHT_BLUE);


      });



      /* CLUSTERING INTERACTION */


      // Clustering bulk work
      $(".start-cluster").on("click", function (e) {

        // Can't run clustering on <2 params
        if (selectedParms.length < 2) {
          alert("Please select 2 parameters to cluster by");
          return;
        }


        // Accumulate the actual data
        var relevantData = [];

        // Curate the dots
        var selectedDots = d3.selectAll(".map-circle")
                    .filter(function (d) {
                      var dotState = d["location_info"]["state"];
                      var inArray = false;
                      selectedStates.forEach(function (s) {
                        inArray = inArray || (s == dotState);
                      });

                      // Populate the above array at the same time
                      if (inArray) {
                        var dataCopy = JSON.parse(JSON.stringify(d));
                        relevantData.push(dataCopy);
                      }

                      return inArray;
                    });


        // Can't run clustering on no data
        if (selectedDots[0].length < 1) {
          alert("Please select states with universities in them");
          return;
        }


        // Accumulate the dot locations
        var currentDotLocations = [];
        selectedDots.each(function (d, i) {
          var cx = parseFloat(d3.select(this).attr("cx"));
          var cy = parseFloat(d3.select(this).attr("cy"));
          var dic = { cx: cx, cy: cy };
          currentDotLocations.push(dic);
        });


        // Remove these
        d3.selectAll(".cluster-circle").remove();
        d3.selectAll(".clusterDot").remove();
        d3.selectAll(".cluster-line").remove();


        // Intersect the two data sets
        overAllData = [];
        for (var i = 0; i < relevantData.length; i++) {
          // Combine the two
          for (var attr in currentDotLocations[i]) {
            relevantData[i][attr] = currentDotLocations[i][attr];
          }
          // Add them to overAllData
          overAllData.push(relevantData[i]);
        }


        // Obtain the data fields
        var firstParam = selectedParms[0].attr("data");
        var firstData = DATA_MAPPINGS[selectedParms[0].attr("data")];
        var secondParam = selectedParms[1].attr("data");
        var secondData = DATA_MAPPINGS[selectedParms[1].attr("data")];


        // k-means cluster this info
        var clusterResult = kMeansCluster(overAllData, 4,
                    firstParam, firstData,
                    secondParam, secondData);
        predict(clusterResult,firstParam,firstData,secondParam,secondData);

        overAllData = clusterResult[0];

        // UPDATING CLUSTERING SCALING + SUCH


        // Rescale x + y axes based on the new overall data
        xScale.domain(d3.extent(overAllData, function (d) {
          return d[firstParam][firstData];
        })).nice();

        yScale.domain(d3.extent(overAllData, function (d) {
          return d[secondParam][secondData];
        })).nice();


        // Remove current axes
        d3.select(".x.axis").remove();
        d3.select(".y.axis").remove();


        // Reset Title + Axes Labels
        // Get two titles
        var titleOne = TITLE_MAPPINGS[secondData];
        var titleTwo = TITLE_MAPPINGS[firstData];
        var title = d3.select(".cluster-title").text(titleOne + " vs. " + titleTwo);
        var xLabel = d3.select(".x-label").text(titleTwo);
        var yLabel = d3.select(".y-label").text(titleOne);


        // Reestablish axes

        // Axes
        xAxis = d3.svg.axis().scale(xScale).orient("bottom");
        yAxis = d3.svg.axis().scale(yScale).orient("left");

        // x-axis
        cSVG.append("g")
          .attr("class", "x axis")
          .style("stroke", DARK_BLUE)
          .attr("transform", "translate(0," + clusterHeight + ")")
          .call(xAxis);

        // y-axis
        cSVG.append("g")
          .attr("class", "y axis")
          .style("stroke", DARK_BLUE)
          .call(yAxis);

        // Modify the graph text styling
        cSVG.selectAll(".axis text")
          .attr("class", "graph-text");



        // Add those cluster circles to the current cx and cy
        var newClusterCircles = svg.selectAll(".cluster-circle")
              .data(overAllData).enter()
            .append("circle")
              .attr("r", clusterCircleSize)
              .attr("cx", function (d) { return d["cx"] })
              .attr("cy", function (d) { return d["cy" ]})
              .attr("class", "cluster-circle")
              .style("fill", DARK_BLUE)
              .style("stroke", LIGHT_BLUE)
            .on("mouseover", function (d) {
              mouseOverCallback(d, d3.select(this));
            })
            .on("mouseleave", function (d) {
              mouseLeaveCallback(d, d3.select(this));
            });


        // Move them to proper space on the clustering graph
        newClusterCircles.each(function (d) {
          var cx = xScale(d[firstParam][firstData]);
          var cy = yScale(d[secondParam][secondData]);
          var trueCX = cx + xGraphOffset + padding;
          var trueCY = cy + yGraphOffset + padding;
          d["cx"] = trueCX;
          d["cy"] = trueCY;
          d3.select(this).transition()
            .attr("cx", trueCX)
            .attr("cy", trueCY);
        });


        // add cluster dots
        var newClusters = svg.selectAll(".clusterDot")
          .data(clusterResult[1]).enter()
        .append("circle")
          .attr("r", 3)
          .attr("class", "clusterDot")
          .attr("cx", function (d) {
            var cx = xScale(d[firstParam][firstData]);
            var trueCX = cx + xGraphOffset + padding;
            d["cx"] = trueCX;
            return trueCX;
          })
          .attr("cy", function (d) {
            var cy = yScale(d[secondParam][secondData]);
            var trueCY = cy + yGraphOffset + padding;
            d["cy"] = trueCY;
            return trueCY;
          })
          .style("fill", RED)
          .style("stroke", RED)
          .style("opacity", 0).on("mouseover", function (d) {

            clusterMouseOver(d);

          })
          .on("mouseleave", function (d) {

            clusterMouseLeave(d);

          });

        newClusters.transition().duration(1000).style("opacity", 1.0);



        // Accumulate dot - cluster associations
        thaLines = addClusterLines(newClusters, svg);
        thaLines.moveToBack();

      });
      
