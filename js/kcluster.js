// kcluster.js 



// Basic distance function
function distanceFrom (a, b, xname, x, yname, y, data) {
  //console.log(a, b, xname, x, yname, y, data);
  // Maxes
  var maxX = d3.max(data, function (d) {
    return d[xname][x];
  });
  //console.log(maxX);
  var maxY = d3.max(data, function (d) {

    return d[yname][y];
  });
  //console.log(maxY);


  // Mins
  var minX = d3.min(data, function (d) {
    return d[xname][x];
  })
  var minY = d3.min(data, function (d) {
    return d[yname][y];
  });

  // Relative divisor
  var divX = maxX-minX;
  var divY = maxY-minY;

  // Relative division
  var aX = (a[xname][x]-minX) / (divX).toFixed(4);
  var aY = (a[yname][y]-minY) / (divY).toFixed(4);
  var bX = (b[xname][x]-minX) / (divX).toFixed(4);
  var bY = (b[yname][y]-minY) / (divY).toFixed(4);

  return Math.sqrt(
    (aX - bX) * (aX - bX) + (aY - bY) * (aY - bY)
  );
}


// Given data array filled with JSONs, each with x and y values namespaced under
// the provided parameter values, return a list of k random points of the form
// [ { x: X_VAL, y: Y_VAL, id: 1 }, ..., ... ]
function initalizeClusters (data, k) {
  var initial_centroids = [];
  for (var i = 0; i < k; i++) {
    var n = Math.floor(Math.random() * data.length)
    console.log(n);
    data[n]["id"] = i;
    console.log(JSON.parse(JSON.stringify(data[n])));
    initial_centroids.push(JSON.parse(JSON.stringify(data[n]))); // Copies
  }
  console.log(initial_centroids);
  return initial_centroids
}


// Given data array filled with JSONs, each with x and y values namespaced under
// the provided parameter values, and a series of clusters that have just been
// initialized to random points, return the data JSONs with an extra field
// `clusterId` indicating which cluster the values belong to (minDist away)
// NOTE: returns a copy of the data (to disallow tampering w/original)
function initializeData (data, clusters, xname, x, yname, y) {
  var dataCopies = []
  console.log(clusters);
  for (var i = 0; i < data.length; i++) {
    var distances = clusters.map(function(d) {
      console.log(d);
      return distanceFrom(data[i], d, xname, x, yname, y, data);
    });
    console.log(distances)
    var minDist = d3.min(distances);
    var clusterIndex = distances.indexOf(minDist);
    console.log(clusterIndex);
    console.log(clusters);
    var clusterId = clusters[clusterIndex].id;
    console.log(clusterId);
    var dataCopy = JSON.parse(JSON.stringify(data[i])); // Copies
    dataCopy["clusterId"] = clusterId;
    dataCopies.push(dataCopy);
  }

  return dataCopies;

}


// Given data array filled with JSONs, each with x and y values namespaced under
// the provided parameter values, and a series of clusters that need to be
// updated dependent on the current JSON data associated with them, change the
// cluster x + y values as necessary (mean of all associated data)
function shiftClusters (data, clusters, xname, x, yname, y) {
  console.log(clusters);

  for (var i = 0; i < clusters.length; i++) {
    // Finding relevant data
    var clusterId = clusters[i].id
    var relevantData = data.filter(function (d) { return d.clusterId == clusterId });
    console.log(relevantData);
    // Updating x + y values of cluster
    if (relevantData.length == 0) {
      continue;
    }
    clusters[i][xname][x] = d3.mean(relevantData, function (d) {return d[xname][x] });
    clusters[i][yname][y] = d3.mean(relevantData, function (d) { return d[yname][y] });
    console.log(clusters[i][xname][x]);
    console.log(clusters[i][yname][y]);
  }
  console.log(clusters);
  //console.log(clusters[i][xname][x]);

}



// Given data array filled with JSONs, each with x and y values namespaced under
// the provided parameter values, and a series of clusters that have been updated
// to their proper locations, update the data's `clusterId` to be the closest
// cluster, and return the # of data values whose cluster changes
function changedClusters (data, clusters, xname, x, yname, y) {
  // To track changed clusters
  var numChanged = 0;

  for (var i = 0; i < data.length; i++) {
    var distances = clusters.map(function(d) {
      //console.log(d.length);
      return distanceFrom(data[i], d, xname, x, yname, y, data);
    });
    var minDist = d3.min(distances);
    var cI = distances.indexOf(minDist);
    var clusterId = clusters[cI].id;
    var currentClusterId = data[i].clusterId;
    if (currentClusterId != clusterId) {
      data[i].clusterId = clusterId;
      numChanged++;
    }

  }

  return numChanged;

}




// Overall clustering function.  Takes in original data (`originalData`), # of
// clusters `k`, x and y namespaces, and a function to call after every clustering
// iteration.  Returns data + clusters (to use in displaying the clustering).
function kMeansCluster (originalData, k, xname, x, yname, y) {
  // Initialize
  console.log(originalData, k, xname, x, yname, y)
  var clusters = initalizeClusters(originalData, k);
  //console.log(clusters);
  var data = initializeData(originalData, clusters, xname, x, yname, y);
  console.log(data);

  // Initialize this to track the state of clustering
  var numChanged = null;
  console.log(clusters);

  while (numChanged == null || numChanged > 0) {

    shiftClusters(data, clusters, xname, x, yname, y); // Shift the clusters
    //iterFunc();  -- Would theoretically be a function run after each iteration
    numChanged = changedClusters(data, clusters, xname, x, yname, y);
    console.log(numChanged); // Recalc

  }
  console.log(clusters);


  // Returns data, clusters
  return [data, clusters]



}
