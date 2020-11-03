const ElectionMap = require('./app');
const jQuery = require('jquery');
var customBtn = document.getElementById('custom-file-button');
var realBtn = document.getElementById('real-file');
var detailsButton = document.getElementById('details-button');
var filetxt = document.getElementById('file-text');

jQuery(function () {
	if (customBtn != null)
		customBtn.addEventListener('click', function () {
			realBtn.click();
		});
	realBtn.addEventListener('change', function (event) {
		if (event.target.files[0].name.includes('.xlsx')) {
			ElectionMap.loadXLSXLocal(event.target.files[0], function (e) {
				console.log(e);
			});
		} else if (event.target.files[0].name.includes('.geojson')) {
			ElectionMap.loadJSONLocal(event.target.files[0], function (e) {
				//console.log(e);
				ElectionMap.addNewJSONObject(e);
			});
		}
		let box = document.getElementById('details-box');
		if (box.style.display == 'block') ShowFileInfo(true);
		ElectionMap.LoadMap();
	});
	detailsButton.addEventListener('click', function () {
		detailsButton.classList.toggle('change');
		ShowFileInfo(false);
	});
});
function incrementFileCounter() {
	if (filetxt == null) {
		console.log('file counter does not exist');
		return;
	}
	filesUploaded += 1;
	filetxt.innerHTML = 'Files loaded: ' + filesUploaded;
}
function ShowFileInfo(visibility) {
	let list = document.getElementById('file-list');

	if (box.style.display == 'none' || visibility) {
		box.style.display = 'block';
		let iHTML = '';
		for (fileNameIndex in filePaths) {
			let filename = filePaths[fileNameIndex];
			if (filename.includes('http')) iHTML += '<li><a href="' + filename + '">' + filename + '</a></li>';
			else iHTML += '<li><a href="' + filename + '">' + filename + '</a></li>';
		}
		list.innerHTML = iHTML;
	} else {
		box.style.display = 'none';
	}
}
module.exports = ElectionMap;
