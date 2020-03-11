const mapboxgl = require("mapbox-gl")
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
  map.addSource('Districts', {
    type: 'geojson',
    data: 'https://sholom1.github.io/Election-Mapbox-Local/Election%20Districts.geojson'
  })
  map.addLayer({
    'id': 'Districts',
    'type': 'fill',
    'source': 'Districts',
    'layout': {},
    'paint': {
    'fill-color': '#088',
    'fill-opacity': 0.8
    }
    });
})