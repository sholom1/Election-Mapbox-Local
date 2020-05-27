const ElectionMap = require("./app");
const jQuery = require("jquery");
var customBtn = document.getElementById("custom-file-button"); 
var realBtn = document.getElementById("real-file"); 
var detailsButton = document.getElementById("details-button");
var filetxt = document.getElementById("file-text");

jQuery(document).ready(function(){
    mapboxgl.accessToken = 'pk.eyJ1Ijoic2hvbG9tMSIsImEiOiJjazdtNXkxb2UwZXAzM2tvbTlzempjcGV1In0.zAVBsEkEYNpTAfw20fw2GA';
    filetxt = document.getElementById("file-text")
    customBtn = document.getElementById("custom-file-button")
    realBtn = document.getElementById("real-file")
    detailsButton = document.getElementById("details-button")
    box = document.getElementById("details-box")
  
    ElectionMap.GetGeoJSON('https://sholom1.github.io/Election-Mapbox-Local/Election%20Districts.geojson', ElectionMap.addNewJSONObject)
    ElectionMap.GetResultsXLSX("https://sholom1.github.io/Election-Mapbox-Local/ElectionData.xlsx", 
        function(sheet){
            ElectionMap.addNewXLSXWorksheet(sheet)
            ElectionMap.LoadMap();
        }
    );
    
    if (box.style.display == "") box.style.display = "none"
  
    customBtn.addEventListener("click",function(){
      realBtn.click();
    })
    realBtn.addEventListener("change", function(event){
      if (event.target.files[0].name.includes(".xlsx")){
        ElectionMap.loadXLSXLocal(event.target.files[0], function(e){
          console.log(e);
        })
      }else if (event.target.files[0].name.includes(".geojson")){
        ElectionMap.loadJSONLocal(event.target.files[0], function(e){
          //console.log(e);
          ElectionMap.addNewJSONObject(e);
        })
      }
      let box = document.getElementById("details-box")
      if(box.style.display == "block")
        ShowFileInfo(true)
      ElectionMap.LoadMap();
    })
    detailsButton.addEventListener("click", function(){
      detailsButton.classList.toggle("change")
      ShowFileInfo(false);
    })
  });