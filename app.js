const mapboxgl = require("mapbox-gl")
const jQuery = require("jquery")
const xlsx = require("xlsx")
const fs = require("fs")
mapboxgl.accessToken = 'pk.eyJ1Ijoic2hvbG9tMSIsImEiOiJjazdtNXkxb2UwZXAzM2tvbTlzempjcGV1In0.zAVBsEkEYNpTAfw20fw2GA';
const geoData = {type:"FeatureCollection", features:[]}
function loadMap(){
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
  //loadJSONURL('https://sholom1.github.io/Election-Mapbox-Local/Election%20Districts.geojson', addNewJSONObject)
  //create results object
  var districtElectionResults = {};
  map.on('load', function(){
    loadXLSXURL("https://sholom1.github.io/Election-Mapbox-Local/ElectionData.xlsx", 
      function(worksheet){
        //console.log(worksheet);
        //parse rows & columns
        let range = xlsx.utils.decode_range(worksheet['!ref']);
        let resultFilter = ["Manually Counted Emergency", "Absentee / Military", "Federal", "Affidavit", "Scattered"]
        for(let row = range.s.r, prefix = {}; row < range.e.r; row++){
          if (prefix.number != worksheet['A' + (row + 1).toString()].v){
            prefix = {
              number:worksheet['A' + (row + 1).toString()].v,
              color:getRandomColor()
            };
          }
          if (resultFilter.includes(worksheet['C' + (row + 1).toString()].v)){
            //console.log(worksheet['C' + (row + 1).toString()].v.toString())
            continue;
          }
          let districtNumber = joinDistrictNumbers(prefix.number.toString(), worksheet['B' + (row + 1).toString()].v.toString());
          if (districtElectionResults[districtNumber] == undefined){
            districtElectionResults[districtNumber] = {}
          }
          let results = districtElectionResults[districtNumber]
          results[worksheet['C' + (row + 1).toString()].v] = worksheet['D' + (row + 1).toString()].v
          //console.log(worksheet['C' + (row + 1).toString()].v)
          //console.log(worksheet['D' + (row + 1).toString()].v)
        }
        console.log(districtElectionResults)
        let districtsInExpression = []
        let colorExpression = ['match', ['get', 'elect_dist']];
        let opacityExpression = ['match', ['get', 'elect_dist']]
        for(feature in geoData.features){
          let featureData = geoData.features[feature];
          let color;
          let opacity;
          //console.log(featureData.properties.elect_dist);
          if(featureData.properties.elect_dist == undefined){
            featureData.properties.elect_dist = 00000;
            continue;
          }else if(featureData.properties.elect_dist in districtsInExpression){
            continue;
          }
          districtsInExpression.push(featureData.properties.elect_dist);
          if (featureData.properties.elect_dist in districtElectionResults){
            let prevBallot = {
              name:"",
              votes:0
            }
            //console.log(districtElectionResults[featureData.properties.elect_dist].toString())
            for (candidate in districtElectionResults[featureData.properties.elect_dist]){
              //console.log(districtElectionResults[featureData.properties.elect_dist])
              if (candidate != "Public Counter" && districtElectionResults[featureData.properties.elect_dist][candidate] > prevBallot.votes){
                prevBallot.name = candidate
                prevBallot.votes = districtElectionResults[featureData.properties.elect_dist][candidate]
              }
            }
            color = getPartyColor(prevBallot.name instanceof String ? prevBallot.name : prevBallot.name.toString());
            opacity = (prevBallot.votes/districtElectionResults[featureData.properties.elect_dist]["Public Counter"])
            //console.log(opacity);
          }
          else{
            color = getRandomColor();
            opacity = 0.8;
          }
          featureData.properties['color'] = color
          featureData.properties['victory margin'] = opacity
          featureData.properties['results'] = districtElectionResults[featureData.properties.elect_dist]
          colorExpression.push(featureData.properties.elect_dist, color);
          opacityExpression.push(featureData.properties.elect_dist, opacity);
          //console.log(featureData)
        }
        colorExpression.push('rgba(0,0,0,0)');
        opacityExpression.push(.5);
        map.addSource('districts', {
          'type': 'geojson',
          'data': geoData,
          'generateId': true // This ensures that all features have unique IDs
        });
        map.addLayer({
          'id': 'election-district-visualization',
          'type': 'fill',
          'source': 'districts',
          'layout': {},
          'paint': {
              'fill-color': colorExpression,
              'fill-opacity': opacityExpression
            }
        });
        map.addLayer({
          'id': 'election-district-borders',
          'type': 'line',
          'source': 'districts',
          'layout': {},
          'paint': {
            'line-color': '#000000',
            'line-width': 2
          }
        });
      });
  });
  map.on("mousemove", 'election-district-visualization', function(e){
    if (e.features.length > 0){
      if(e.features[0].properties.results){
        console.log(e.features[0].properties.results);
        let details = "<p>Election District: " + e.features[0].properties.elect_dist + "</p>"  
        for(candidate in districtElectionResults[e.features[0].properties.elect_dist]){
          details += "<span class = \"color-box\" "+"style=\"backround-color: " + getPartyColor(candidate) + ";\"></span><p>" + candidate + ": " + districtElectionResults[e.features[0].properties.elect_dist][candidate]+"</p>"
        }
        details += ""
        document.getElementById("Data-Box").innerHTML = details;
      }
    }
  })
}
loadJSONURL('https://sholom1.github.io/Election-Mapbox-Local/Election%20Districts.geojson', addNewJSONObject)
loadMap();
const customBtn = document.getElementById("custom-file-button")
const realBtn = document.getElementById("real-file")
const filetxt = document.getElementById("file-text")

customBtn.addEventListener("click",function(){
  realBtn.click();
})
realBtn.addEventListener("change", function(event){
  if (event.target.files[0].name.includes(".xlsx")){
    loadXLSXLocal(event.target.files[0], function(e){
      console.log(e);
    })
  }else if (event.target.files[0].name.includes(".geojson")){
    loadJSONLocal(event.target.files[0], function(e){
      //console.log(e);
      addNewJSONObject(e);
    })
  }
  loadMap();
})

function loadJSONURL(filename, callback) {   
  var xobj = new XMLHttpRequest();
  xobj.overrideMimeType("application/json");
  xobj.open('GET', filename, true); 
  xobj.onreadystatechange = function () {
    if (xobj.readyState == 4 && xobj.status == "200") {
      // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
      callback(JSON.parse(xobj.responseText));
    }
  };
  xobj.send(null);  
}

function loadXLSXURL(filename, callback){
  let oReq = new XMLHttpRequest();
  oReq.open("GET", filename, true);
  oReq.responseType = "arraybuffer";

  oReq.onload = function(e) {
    let arraybuffer = oReq.response;
    /* convert data to binary string */
    let data = new Uint8Array(arraybuffer);
    let arr = new Array();
    for(let i = 0; i != data.length; ++i) arr[i] = String.fromCharCode(data[i]);
    let bstr = arr.join("");
    /* Call XLSX */
    let workbook = xlsx.read(bstr, {type:"binary", raw:true})
    callback(workbook.Sheets[workbook.SheetNames[0]]);
  }
  oReq.send(null);  
}

function loadXLSXLocal(filename, callback){
  let reader = new FileReader();
  reader.onload = function(){
    let data = new Uint8Array(reader.result)
    let arr = new Array();
    for(let i = 0; i != data.length; ++i) arr[i] = String.fromCharCode(data[i]);
    let bstr = arr.join("");
    /* Call XLSX */
    let workbook = xlsx.read(bstr, {type:"binary", raw:true})
    callback(workbook.Sheets[workbook.SheetNames[0]]);
  }
  reader.readAsArrayBuffer(filename);
}
function loadJSONLocal(filename, callback){
  let reader = new FileReader();
  reader.onload = function(){
    callback(JSON.parse(reader.result));
  }
  reader.readAsText(filename);
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
function getPartyColor(candidate){
  //console.log(candidate)
  if (candidate.includes("Democratic"))
    return "#0015BC"
  else if (candidate.includes("Working Families"))
    return "#800080"
  else if (candidate.includes("Republican"))
    return "#FF0000"
  else if (candidate.includes("Reform"))
    return "#FF4500"
  else
    return "#C0C0C0"
}
function addNewJSONObject(data){
  for(feature in data.features){
    if (!geoData.features.includes(data.features[feature]))
      geoData.features.push(data.features[feature])
  }
  //console.log(data)
  console.log(geoData);
}