const mapboxgl = require("mapbox-gl")
const jQuery = require("jquery")
const xlsx = require("xlsx")
const fs = require("fs")
mapboxgl.accessToken = 'pk.eyJ1Ijoic2hvbG9tMSIsImEiOiJjazdtNXkxb2UwZXAzM2tvbTlzempjcGV1In0.zAVBsEkEYNpTAfw20fw2GA';
var map = new mapboxgl.Map({
    container: 'map',
    center: [-73.952319, 40.631056],
    zoom: 9.91,
    hash: true,
    style:'mapbox://styles/sholom1/ck7np8jrn11bo1intt1lh5owr',
    transformRequest: (url, resourceType)=> {
      if(resourceType === 'Source' && url.startsWith('http://localhost:8080')) {
        return {
         url: url.replace('http', 'https'),
         headers: { 'my-custom-header': true},
         credentials: 'include'  // Include cookies for cross-origin requests
       }
      }
    }
  });
  map.on('load', function(){
    var districtData
    loadJSON('https://sholom1.github.io/Election-Mapbox-Local/Election%20Districts.geojson', 
      function(response) {
      // Parsing JSON string into object
        districtData = JSON.parse(response);
        loadXLSX("https://sholom1.github.io/Election-Mapbox-Local/ElectionData.xlsx", 
          function(worksheet){
            console.log(worksheet);
            var range = xlsx.utils.decode_range(worksheet['!ref']);
            var districtElectionResults = {};
            for(var row = range.s.r; row < range.e.r; row++){
              districtElectionResults[joinDistrictNumbers(worksheet['A' + (row + 1).toString()].v.toString(), worksheet['B' + (row + 1).toString()].v.toString())] = "#F7FF00"
            }
            var expression = ['match', ['get', 'elect_dist']];
            for(feature in districtData.features){
              var featureData = districtData.features[feature];
              var color = getRandomColor();
              console.log(featureData.properties.elect_dist);
              if (featureData.properties.elect_dist in districtElectionResults)
                color = "#F7FF00"
              featureData.properties['color'] = color
              expression.push(featureData.properties.elect_dist, color);
              //console.log(featureData)
            }
            expression.push('rgba(0,0,0,0)');
            map.addSource('districts', {
              'type': 'geojson',
              'data': 'https://sholom1.github.io/Election-Mapbox-Local/Election%20Districts.geojson',
              'generateId': true // This ensures that all features have unique IDs
            });
            map.addLayer({
              'id': 'election-district-visualization',
              'type': 'fill',
              'source': 'districts',
              'layout': {},
              'paint': {
              'fill-color': expression,
              'fill-opacity': 0.8
              }
              });
          });
     });
  })
function loadJSON(filename, callback) {   

  var xobj = new XMLHttpRequest();
      xobj.overrideMimeType("application/json");
  xobj.open('GET', filename, true); 
  xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
          // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
          callback(xobj.responseText);
        }
  };
  xobj.send(null);  
}
function loadXLSX(filename, callback){
  var oReq = new XMLHttpRequest();
  oReq.open("GET", filename, true);
  oReq.responseType = "arraybuffer";

  oReq.onload = function(e) {
    var arraybuffer = oReq.response;
    /* convert data to binary string */
    var data = new Uint8Array(arraybuffer);
    var arr = new Array();
    for(var i = 0; i != data.length; ++i) arr[i] = String.fromCharCode(data[i]);
    var bstr = arr.join("");
    /* Call XLSX */
    var workbook = xlsx.read(bstr, {type:"binary"})
    callback(workbook.Sheets[workbook.SheetNames[0]]);
  }
  oReq.send(null);  
}
function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
function joinDistrictNumbers(assembly, district){
  while(district.length <= 2){
    district = "0" + district;
  }
  return parseInt(assembly + district);
}