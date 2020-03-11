const mapboxgl = require("mapbox-gl")
print("test");
mapboxgl.accessToken = 'pk.eyJ1Ijoic2hvbG9tMSIsImEiOiJjazdtNXkxb2UwZXAzM2tvbTlzempjcGV1In0.zAVBsEkEYNpTAfw20fw2GA';
var map = new mapboxgl.Map({
    container: 'map',
    center: [40.6782, 73.9442],
    zoom: 13,
    hash: true,
    style:'mapbox://styles/sholom1/ck7m6023r0ike1ipsvptitk9c',
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