const mapboxgl = require('mapbox-gl');
const xlsx = require('xlsx');
const TinyQueue = require('tinyqueue');
const filePaths = [];
const geoData = { type: 'FeatureCollection', features: [] };
var worksheets = [];
var filesUploaded = parseInt('0');
var Credits = [];
var UseMajorParties = false;
var ColorObject = {};

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
		map.on('load', function () {
			//Turn the xlsx files into a js object

			console.log(districtElectionResults);

			geoData.features = geoData.features.filter(filter.isFeatureInResults);

			let expressions = new LayerExpressions(districtElectionResults);

			console.log(geoData);
			map.addSource('districts', {
				type: 'geojson',
				data: geoData,
				generateId: true, // This ensures that all features have unique IDs
			});
			map.addLayer({
				id: 'election-district-visualization',
				type: 'fill',
				source: 'districts',
				layout: {},
				paint: {
					'fill-color': expressions.colorExpression,
					'fill-opacity': expressions.opacityExpression,
				},
			});
			map.addLayer({
				id: 'election-district-borders',
				type: 'line',
				source: 'districts',
				layout: {},
				paint: {
					'line-color': '#000000',
					'line-width': 2,
				},
			});
		});
		map.on('mousemove', 'election-district-visualization', function (e) {
			if (e.features.length > 0) {
				if (e.features[0].properties.results) {
					let details = '';
					console.log(e.features[0].properties.results);
					if (districtElectionResults[e.features[0].properties.elect_dist]['Total Votes'] == 0) {
						details += '<p class = "ballot-text">This ED has been combined</p>';
					} else {
						details =
							'<ul><p>Election District: ' +
							e.features[0].properties.elect_dist +
							'</p><p>Total Votes: ' +
							districtElectionResults[e.features[0].properties.elect_dist]['Total Votes'] +
							'</p></ul><table><tr><th>Candidate</th><th>Votes</th><th>Percentage</th>';

						for (candidate in districtElectionResults[e.features[0].properties.elect_dist]) {
							if (candidate != 'Total Votes') {
								details +=
									'<tr><th><p class = "ballot-text"><span class = "color-box" ' +
									'style="background-color: ' +
									getPartyColor(candidate) +
									';"></span>\t' +
									candidate +
									': </p></th><th>' +
									districtElectionResults[e.features[0].properties.elect_dist][candidate] +
									'</th><th>' +
									Math.round(
										(districtElectionResults[e.features[0].properties.elect_dist][candidate] /
											districtElectionResults[e.features[0].properties.elect_dist][
												'Total Votes'
											]) *
											100
									) +
									'%</th></tr>';
							}
						}
						details += '</table>';
					}
					document.getElementById('Data-Box').innerHTML = details;
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
		oReq.open('GET', filename, true);
		oReq.responseType = 'arraybuffer';

		oReq.onload = function (e) {
			let arraybuffer = oReq.response;
			/* convert data to binary string */
			let data = new Uint8Array(arraybuffer);
			let arr = new Array();
			for (let i = 0; i != data.length; ++i) arr[i] = String.fromCharCode(data[i]);
			let bstr = arr.join('');
			/* Call XLSX */
			let workbook = xlsx.read(bstr, { type: 'binary', raw: true });
			callback(workbook.Sheets[workbook.SheetNames[0]]);
		};
		oReq.send(null);
		filePaths.push(filename);
	},
	GetJSONURL: function (filename, callback) {
		var xobj = new XMLHttpRequest();
		xobj.overrideMimeType('application/json');
		xobj.open('GET', filename, true);
		xobj.onreadystatechange = function () {
			if (xobj.readyState == 4 && xobj.status == '200') {
				// Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
				callback(JSON.parse(xobj.responseText));
			}
		};
		xobj.send(null);
		filePaths.push(filename);
	},
	AddAtribution: function (credit) {
		Credits.push(credit);
	},
	//#endregion
	//#region Local Data
	loadXLSXLocal: function (filename, callback) {
		let reader = new FileReader();
		reader.onload = function () {
			let data = new Uint8Array(reader.result);
			let arr = new Array();
			for (let i = 0; i != data.length; ++i) arr[i] = String.fromCharCode(data[i]);
			let bstr = arr.join('');
			/* Call XLSX */
			let workbook = xlsx.read(bstr, { type: 'binary', raw: true });
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
			if (!isElectionDistrictInSavedGeoJSON(data.features[feature].properties.elect_dist))
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
		console.log('data cleared');
		console.log(geoData.features);
		console.log(worksheets);
	},
	SetColorData: function (data) {
		ColorObject = data;
	},
	SetCandidateColor: function (name, color) {
		ColorObject[name] = color;
		this.LoadMap();
		return ColorObject;
	},
	DownloadColorData: function () {
		downloadObjectAsJson(ColorObject, 'Candidate Color File');
		return ColorObject;
	},
	//#endregion
	SetUseMajorParties: function (value) {
		UseMajorParties = value;
	},
};

function getRandomColor() {
	var letters = '0123456789ABCDEF';
	var color = '#';
	for (var i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}
function joinDistrictNumbers(assembly, district) {
	while (district.length <= 2) {
		district = '0' + district;
	}
	return parseInt(assembly + district);
}
function getPartyColor(candidate) {
	//console.log(candidate)
	if (UseMajorParties) {
		if (candidate.includes('Democratic')) return '#0015BC';
		else if (candidate.includes('Republican')) return '#FF0000';
	} else if (candidate != 'Total Votes') {
		let mCandidate = candidate.replace(/ *\([^)]*\) */g, '');
		if (ColorObject[mCandidate] == undefined) ColorObject[mCandidate] = getRandomColor();
		return ColorObject[mCandidate];
	}
	return '#C0C0C0';
}

function isElectionDistrictInSavedGeoJSON(electionDist) {
	for (sFeature in geoData.features) {
		if (geoData.features[sFeature].properties.elect_dist == electionDist) return true;
	}
	return false;
}
function downloadObjectAsJson(exportObj, exportName) {
	var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj));
	var downloadAnchorNode = document.createElement('a');
	downloadAnchorNode.setAttribute('href', dataStr);
	downloadAnchorNode.setAttribute('download', exportName + '.json');
	document.body.appendChild(downloadAnchorNode); // required for firefox
	downloadAnchorNode.click();
	downloadAnchorNode.remove();
}

class ElectionData {
	constructor() {
		for (let index in worksheets) {
			let worksheet = worksheets[index];
			//parse rows & columns
			let range = xlsx.utils.decode_range(worksheet['!ref']);
			let nameChanges = {
				filter: ['Manually Counted Emergency', 'Absentee / Military', 'Federal', 'Affidavit', 'Scattered'],
				conversion: {
					'Public Counter': 'Total Votes',
				},
			};
			for (let row = range.s.r, prefix = {}; row < range.e.r; row++) {
				let name = UseMajorParties
					? worksheet['C' + rowIndexAsString(row)].v
					: worksheet['C' + rowIndexAsString(row)].v.replace(/ *\([^)]*\) */g, '');

				if (prefix.number != worksheet['A' + rowIndexAsString(row)].v) {
					prefix = {
						number: worksheet['A' + rowIndexAsString(row)].v,
						color: getRandomColor(),
					};
				}

				//Check if name is not considered or
				//if name == "Public Counter" then change in worksheet to "Total Votes"
				if (nameChanges.filter.includes(worksheet['C' + rowIndexAsString(row)].v)) {
					continue;
				} else if (nameChanges.conversion[worksheet['C' + rowIndexAsString(row)].v]) {
					worksheet['C' + rowIndexAsString(row)].v =
						nameChanges.conversion[worksheet['C' + rowIndexAsString(row)].v];
				}

				let districtNumber = joinDistrictNumbers(
					prefix.number.toString(),
					worksheet['B' + rowIndexAsString(row)].v.toString()
				);
				if (this[districtNumber] == undefined) {
					this[districtNumber] = {};
				}
				let results = this[districtNumber];
				if (worksheet['C' + rowIndexAsString(row)].v == 'Total Votes') {
					results['Total Votes'] = 0;
				} else {
					results[worksheet['C' + rowIndexAsString(row)].v] = worksheet['D' + rowIndexAsString(row)].v;
					results['Total Votes'] += worksheet['D' + rowIndexAsString(row)].v;
				}
			}
		}
	}
}
function rowIndexAsString(row) {
	return (row + 1).toString();
}
/**
 * A linear interpolator for hexadecimal colors
 * @param {String} a
 * @param {String} b
 * @param {Number} amount
 * @example
 * // returns #7F7F7F
 * lerpColor('#000000', '#ffffff', 0.5)
 * @returns {String}
 */
function lerpColor(a, b, amount) {
	var ah = parseInt(a.replace(/#/g, ''), 16),
		ar = ah >> 16,
		ag = (ah >> 8) & 0xff,
		ab = ah & 0xff,
		bh = parseInt(b.replace(/#/g, ''), 16),
		br = bh >> 16,
		bg = (bh >> 8) & 0xff,
		bb = bh & 0xff,
		rr = ar + amount * (br - ar),
		rg = ag + amount * (bg - ag),
		rb = ab + amount * (bb - ab);

	return '#' + (((1 << 24) + (rr << 16) + (rg << 8) + rb) | 0).toString(16).slice(1);
}

class Map {
	constructor() {
		return new mapboxgl.Map({
			container: 'map',
			center: [-73.952319, 40.631056],
			zoom: 9.91,
			hash: true,
			style: 'mapbox://styles/sholom1/ck7np8jrn11bo1intt1lh5owr',
			transformRequest: (url, resourceType) => {
				if (resourceType === 'Source' && url.startsWith('http://localhost:8080')) {
					return {
						url: url.replace('http', 'https'),
						headers: { 'my-custom-header': true },
						credentials: 'include', // Include cookies for cross-origin requests
					};
				}
			},
			attributionControl: false,
		}).addControl(
			new mapboxgl.AttributionControl({
				compact: true,
				customAttribution: Credits,
			})
		);
	}
}
class LayerExpressions {
	constructor(districtElectionResults) {
		this.districtsInExpression = [];
		this.colorExpression = ['match', ['get', 'elect_dist']];
		this.opacityExpression = ['match', ['get', 'elect_dist']];
		for (feature in geoData.features) {
			let featureData = geoData.features[feature];
			let district = featureData.properties.elect_dist;
			let color;
			let opacity;
			//console.log(featureData.properties.elect_dist);
			if (district == undefined) {
				featureData.properties.elect_dist = 0;
				continue;
			} else if (district in this.districtsInExpression) {
				continue;
			} else if (districtElectionResults[district] != undefined) {
				/*
        this.districtsInExpression.push(district);
        let prevBallot = {
          name: '',
          votes: 0,
        };
        for (let candidate in districtElectionResults[district]) {
          if (candidate == 'Total Votes') continue;
          else if (districtElectionResults[district][candidate] > prevBallot.votes) {
            prevBallot.name = candidate;
            prevBallot.votes = districtElectionResults[district][candidate];
          }
        }
        */
				if (districtElectionResults[district]['Total Votes'] > 0) {
					let nameResults = new NameBasedResults(districtElectionResults[district]);
					let candidateQueue = new TinyQueue();
					for (let candidate in nameResults.candidates) {
						candidateQueue.push(nameResults.candidates[candidate], nameResults.candidates[candidate].votes);
					}
					let candidateA = undefined;
					while (candidateQueue.length) {
						let candidateB = candidateQueue.pop();
						if (candidateA == undefined) {
							candidateA = candidateB;
							continue;
						}
						console.log(candidateA.color);
						console.log(candidateB.color);
						console.log(
							candidateB.votes - (candidateA.votes * 0.5) / (candidateA.votes + candidateB.votes)
						);
						candidateA = {
							votes: candidateA.votes + candidateB.votes,
							color: lerpColor(
								candidateA.color,
								candidateB.color,
								candidateB.votes / (candidateA.votes + candidateB.votes)
							),
						};
						console.log(candidateA);
					}
					let color = candidateA.color;
					opacity = nameResults.highest.votes / districtElectionResults[district]['Total Votes'];
					//console.log(opacity);
					featureData.properties['color'] = color;
					featureData.properties['victory margin'] = opacity;
					featureData.properties['results'] = districtElectionResults[district];
					this.colorExpression.push(district, featureData.properties['color']);
					this.opacityExpression.push(district, featureData.properties['victory margin']);
				} else {
					featureData.properties['color'] = '#C0C0C0';
					featureData.properties['victory margin'] = 1;
					featureData.properties['results'] = districtElectionResults[district];
					this.colorExpression.push(district, featureData.properties['color']);
					this.opacityExpression.push(district, featureData.properties['victory margin']);
				}
			} else {
				geoData.features.splice(feature);
			}
		}
		this.colorExpression.push('rgba(0,0,0,0)');
		this.opacityExpression.push(0.5);
	}
}
class NameBasedResults {
	constructor(districtResults) {
		this.candidates = {};
		this.highest = {
			name: '',
			votes: 0,
		};
		for (let candidate in districtResults) {
			if (candidate == 'Total Votes') continue;
			let mCandidate = candidate.replace(/ *\([^)]*\) */g, '');
			if (this.candidates[mCandidate] == undefined) {
				this.candidates[mCandidate] = { votes: districtResults[candidate], color: getPartyColor(mCandidate) };
			} else {
				this.candidates[mCandidate].votes += districtResults[candidate];
			}
			if (this.candidates[mCandidate].votes > this.highest.votes) {
				this.highest.name = mCandidate;
				this.highest.votes = this.candidates[mCandidate].votes;
			}
		}
		this.highest.votes = this.candidates[this.highest.name].votes;
		this.color = getPartyColor(this.highest.name);
	}
}
