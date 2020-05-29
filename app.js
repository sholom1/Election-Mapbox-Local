const mapboxgl = require("mapbox-gl");
const xlsx = require("xlsx");
const filePaths = [];
const geoData = { type: "FeatureCollection", features: [] };
var worksheets = [];
var filesUploaded = parseInt("0");

module.exports = {
  //#region Load Map
  SetAccessToken: function (token) {
    mapboxgl.accessToken = token;
  },
  LoadMap: function () {
    var map = new Map();
    //create results object
    var districtElectionResults = new ElectionData();

    var filter = {
      IsDistrictInResult: function (district) {
        return districtElectionResults[district] != undefined;
      },
      isFeatureInResults: function (feature) {
        return districtElectionResults[feature.properties.elect_dist];
      },
    };
    //the callback will run once the map has finished loading
    map.on("load", function () {
      //Turn the xlsx files into a js object

      console.log(districtElectionResults);

      geoData.features = geoData.features.filter(filter.isFeatureInResults);

      let expressions = new LayerExpressions(districtElectionResults);

      console.log(geoData);
      map.addSource("districts", {
        type: "geojson",
        data: geoData,
        generateId: true, // This ensures that all features have unique IDs
      });
      map.addLayer({
        id: "election-district-visualization",
        type: "fill",
        source: "districts",
        layout: {},
        paint: {
          "fill-color": expressions.colorExpression,
          "fill-opacity": expressions.opacityExpression,
        },
      });
      map.addLayer({
        id: "election-district-borders",
        type: "line",
        source: "districts",
        layout: {},
        paint: {
          "line-color": "#000000",
          "line-width": 2,
        },
      });
    });
    map.on("mousemove", "election-district-visualization", function (e) {
      if (e.features.length > 0) {
        if (e.features[0].properties.results) {
          console.log(e.features[0].properties.results);
          let details =
            "<ul><p>Election District: " +
            e.features[0].properties.elect_dist +
            "</p>";
          for (candidate in districtElectionResults[
            e.features[0].properties.elect_dist
          ]) {
            details +=
              '<li class="ballot-entry"><p class = "ballot-text"><span class = "color-box" ' +
              'style="background-color: ' +
              getPartyColor(candidate) +
              ';"></span>\t' +
              candidate +
              ": " +
              districtElectionResults[e.features[0].properties.elect_dist][
                candidate
              ] +
              "</p></li>";
          }
          details += "</ul>";
          document.getElementById("Data-Box").innerHTML = details;
        }
      }
    });
  },

  IsDistrictInResult: function (district) {
    return districtElectionResults[district] != undefined;
  },
  isFeatureInResults: function (feature) {
    return districtElectionResults[feature.properties.elect_dist];
  },
  //#endregion
  //#region Data Functions
  //#region Web Data
  GetResultsXLSX: function (filename, callback) {
    let oReq = new XMLHttpRequest();
    oReq.open("GET", filename, true);
    oReq.responseType = "arraybuffer";

    oReq.onload = function (e) {
      let arraybuffer = oReq.response;
      /* convert data to binary string */
      let data = new Uint8Array(arraybuffer);
      let arr = new Array();
      for (let i = 0; i != data.length; ++i)
        arr[i] = String.fromCharCode(data[i]);
      let bstr = arr.join("");
      /* Call XLSX */
      let workbook = xlsx.read(bstr, { type: "binary", raw: true });
      callback(workbook.Sheets[workbook.SheetNames[0]]);
    };
    oReq.send(null);
    filePaths.push(filename);
  },
  GetGeoJSON: function (filename, callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open("GET", filename, true);
    xobj.onreadystatechange = function () {
      if (xobj.readyState == 4 && xobj.status == "200") {
        // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
        callback(JSON.parse(xobj.responseText));
      }
    };
    xobj.send(null);
    filePaths.push(filename);
  },
  //#endregion
  //#region Local Data
  loadXLSXLocal: function (filename, callback) {
    let reader = new FileReader();
    reader.onload = function () {
      let data = new Uint8Array(reader.result);
      let arr = new Array();
      for (let i = 0; i != data.length; ++i)
        arr[i] = String.fromCharCode(data[i]);
      let bstr = arr.join("");
      /* Call XLSX */
      let workbook = xlsx.read(bstr, { type: "binary", raw: true });
      callback(workbook.Sheets[workbook.SheetNames[0]]);
    };
    reader.readAsArrayBuffer(filename);
    filePaths.push(filename.name);
  },
  loadJSONLocal: function (filename, callback) {
    let reader = new FileReader();
    reader.onload = function () {
      callback(JSON.parse(reader.result));
    };
    reader.readAsText(filename);
    filePaths.push(filename.name);
  },
  //#endregion
  addNewJSONObject: function (data) {
    for (feature in data.features) {
      if (data.features[feature].properties.elect_dist == undefined) {
        data.features[feature].properties.elect_dist = 00000;
        geoData.features.push(data.features[feature]);
        continue;
      }
      if (
        !isElectionDistrictInSavedGeoJSON(
          data.features[feature].properties.elect_dist
        )
      )
        geoData.features.push(data.features[feature]);
    }
    //console.log(data)
    console.log(geoData);
  },
  addNewXLSXWorksheet: function (sheet) {
    worksheets.push(sheet);
  },
  ClearData: function (geojson, xlsx, reload) {
    if (geojson == true) geoData.features = [];
    if (xlsx == true) worksheets = [];
    if (reload == true) this.LoadMap();
    console.log("data cleared");
    console.log(geoData.features);
    console.log(worksheets);
  },
  //#endregion
};

function getRandomColor() {
  var letters = "0123456789ABCDEF";
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
function joinDistrictNumbers(assembly, district) {
  while (district.length <= 2) {
    district = "0" + district;
  }
  return parseInt(assembly + district);
}
function getPartyColor(candidate) {
  //console.log(candidate)
  if (candidate.includes("Democratic")) return "#0015BC";
  else if (candidate.includes("Working Families")) return "#800080";
  else if (candidate.includes("Republican")) return "#FF0000";
  else if (candidate.includes("Reform")) return "#FF4500";
  else return "#C0C0C0";
}

function isElectionDistrictInSavedGeoJSON(electionDist) {
  for (sFeature in geoData.features) {
    if (geoData.features[sFeature].properties.elect_dist == electionDist)
      return true;
  }
  return false;
}

class ElectionData {
  constructor() {
    for (let index in worksheets) {
      let worksheet = worksheets[index];
      //parse rows & columns
      let range = xlsx.utils.decode_range(worksheet["!ref"]);
      let nameChanges = {
        filter: [
          "Manually Counted Emergency",
          "Absentee / Military",
          "Federal",
          "Affidavit",
          "Scattered",
        ],
        conversion: {
          "Public Counter": "Total Votes",
        },
      };
      for (let row = range.s.r, prefix = {}; row < range.e.r; row++) {
        if (prefix.number != worksheet["A" + rowIndexAsString(row)].v) {
          prefix = {
            number: worksheet["A" + rowIndexAsString(row)].v,
            color: getRandomColor(),
          };
        }
        if (
          nameChanges.filter.includes(worksheet["C" + rowIndexAsString(row)].v)
        ) {
          continue;
        } else if (
          nameChanges.conversion[worksheet["C" + rowIndexAsString(row)].v]
        ) {
          worksheet["C" + rowIndexAsString(row)].v =
            nameChanges.conversion[worksheet["C" + rowIndexAsString(row)].v];
        }
        let districtNumber = joinDistrictNumbers(
          prefix.number.toString(),
          worksheet["B" + rowIndexAsString(row)].v.toString()
        );
        if (this[districtNumber] == undefined) {
          this[districtNumber] = {};
        }
        let results = this[districtNumber];
        if (worksheet["C" + rowIndexAsString(row)].v == "Total Votes") {
          results[worksheet["C" + rowIndexAsString(row)].v] = 0;
        } else {
          results[worksheet["C" + rowIndexAsString(row)].v] =
            worksheet["D" + rowIndexAsString(row)].v;
          results["Total Votes"] += worksheet["D" + rowIndexAsString(row)].v;
        }
      }
    }
  }
}
function rowIndexAsString(row) {
  return (row + 1).toString();
}

class Map {
  constructor() {
    return new mapboxgl.Map({
      container: "map",
      center: [-73.952319, 40.631056],
      zoom: 9.91,
      hash: true,
      style: "mapbox://styles/sholom1/ck7np8jrn11bo1intt1lh5owr",
      transformRequest: (url, resourceType) => {
        if (
          resourceType === "Source" &&
          url.startsWith("http://localhost:8080")
        ) {
          return {
            url: url.replace("http", "https"),
            headers: { "my-custom-header": true },
            credentials: "include", // Include cookies for cross-origin requests
          };
        }
      },
    });
  }
}
class LayerExpressions {
  constructor(districtElectionResults) {
    this.districtsInExpression = [];
    this.colorExpression = ["match", ["get", "elect_dist"]];
    this.opacityExpression = ["match", ["get", "elect_dist"]];
    for (feature in geoData.features) {
      let featureData = geoData.features[feature];
      let color;
      let opacity;
      //console.log(featureData.properties.elect_dist);
      if (featureData.properties.elect_dist == undefined) {
        featureData.properties.elect_dist = 0;
        continue;
      } else if (
        featureData.properties.elect_dist in this.districtsInExpression
      ) {
        continue;
      }
      if (
        districtElectionResults[featureData.properties.elect_dist] != undefined
      ) {
        this.districtsInExpression.push(featureData.properties.elect_dist);
        let prevBallot = {
          name: "",
          votes: 0,
        };
        for (let candidate in districtElectionResults[
          featureData.properties.elect_dist
        ]) {
          if (
            candidate != "Total Votes" &&
            districtElectionResults[featureData.properties.elect_dist][
              candidate
            ] > prevBallot.votes
          ) {
            prevBallot.name = candidate;
            prevBallot.votes =
              districtElectionResults[featureData.properties.elect_dist][
                candidate
              ];
          }
        }
        color = getPartyColor(
          prevBallot.name instanceof String
            ? prevBallot.name
            : prevBallot.name.toString()
        );
        opacity =
          prevBallot.votes /
          districtElectionResults[featureData.properties.elect_dist][
            "Total Votes"
          ];
        //console.log(opacity);
        featureData.properties["color"] = color;
        featureData.properties["victory margin"] = opacity;
        featureData.properties["results"] =
          districtElectionResults[featureData.properties.elect_dist];
        this.colorExpression.push(featureData.properties.elect_dist, color);
        this.opacityExpression.push(featureData.properties.elect_dist, opacity);
      } else {
        geoData.features.splice(feature);
      }
    }
    this.colorExpression.push("rgba(0,0,0,0)");
    this.opacityExpression.push(0.5);
  }
}
