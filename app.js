'use strict'
const mapboxgl = require("mapbox-gl")
print("test");
mapboxgl.accessToken = 'pk.eyJ1Ijoic2hvbG9tMSIsImEiOiJjazdtNXkxb2UwZXAzM2tvbTlzempjcGV1In0.zAVBsEkEYNpTAfw20fw2GA';
var map = new mapboxgl.Map({
container: 'map',
style: 'mapbox://styles/mapbox/streets-v11'
});