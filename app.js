const mapboxgl = require("mapbox-gl")
const jQuery = require("jquery")
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
    loadJSON(function(response) {
      // Parsing JSON string into object
        districtData = JSON.parse(response);
        var expression = ['match', ['get', 'elect_dist']];
        for(feature in districtData.features){
          districtData.features[feature].properties['color'] = getRandomColor()
          expression.push(districtData.features[feature].properties.elect_dist, getRandomColor());
          console.log(districtData.features[feature])
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
    
    
  })
function loadJSON(callback) {   

  var xobj = new XMLHttpRequest();
      xobj.overrideMimeType("application/json");
  xobj.open('GET', 'https://sholom1.github.io/Election-Mapbox-Local/Election%20Districts.geojson', true); // Replace 'appDataServices' with the path to your file
  xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
          // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
          callback(xobj.responseText);
        }
  };
  xobj.send(null);  
}
function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}