//#region modules
const mapboxgl = require('mapbox-gl');
const xlsx = require('xlsx');
const PriorityQueue = require('tinyqueue');
const EasyStack = require('js-queue/stack');
//#endregion

const filePaths = [];
const geoData = { type: 'FeatureCollection', features: [] };
var worksheets = [];
var Credits = [];
var overlayGeoData = { type: 'FeatureCollection', features: [] };
var overlayFilter = { propertyTag: '', values: [] };

var filesUploaded = parseInt('0');
var ColorObject = {
	candidates: {},
	parties: {},
	exceptionTags: {},
};
var FocusedDistrict = {
	elect_dist: 0,
	mousePos: { lng: 0, lat: 0 },
};
var Popup = null;
var style;
var dcIndex = 0;
const RenderSettingEnum = {
	Combined: 'Combined',
	Discarded: 'Discarded',
	RandomColor: 'RandomColor',
};
const DistrictRenderSettings = {
	Empty: RenderSettingEnum.Discarded,
	ZeroVotes: RenderSettingEnum.Combined,
};

module.exports = {
	//#region Load Map
	SetAccessToken: function (token) {
		mapboxgl.accessToken = token;
	},
	SetStyle: function (nStyle) {
		style = nStyle;
	},
	LoadMap: function () {
		var map = new Map();
		if (worksheets.length == 0 && geoData.features.length == 0) return;
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

			//console.log(districtElectionResults);

			//geoData.features = geoData.features.filter(filter.isFeatureInResults);

			let expressions = new LayerExpressions(districtElectionResults);

			//console.log(geoData);
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
					'line-width': 0.2,
				},
			});
			if (overlayFilter.values.length > 0 && overlayGeoData.features.length > 0) {
				map.addSource('overlay', {
					type: 'geojson',
					data: overlayGeoData,
					generateId: true,
				});
				map.addLayer({
					id: 'overlay-ditrict-borders',
					type: 'line',
					source: 'overlay',
					layout: {},
					paint: {
						'line-color': '#000000',
						'line-width': 2,
					},
				});
			}

			console.log({ districtElectionResults, expressions, geoData });
		});
		map.on('mousemove', 'election-district-visualization', function (e) {
			if (e.features.length > 0) {
				let fProperties = e.features[0].properties;
				if (fProperties.results) {
					if (fProperties.elect_dist) {
						if (fProperties.elect_dist != FocusedDistrict.elect_dist) {
							FocusedDistrict = { elect_dist: fProperties.elect_dist, mousePos: e.lnglat };
							//console.log(fProperties.results);
							let details = '';
							let district = districtElectionResults[fProperties.elect_dist];
							if (
								district['Total Votes'] == 0 ||
								(fProperties.results.isCombined != undefined && fProperties.isCombined == true)
							) {
								details += '<p class = "ballot-text">This ED has been combined</p>';
							} else {
								details =
									'<ul><p>Election District: ' +
									fProperties.elect_dist +
									'</p><p>Total Votes: ' +
									district['Total Votes'] +
									'</p></ul>' +
									'<div class="map-popup"><table><tr><th>Candidate</th><th>Votes</th><th>Percentage</th>';

								let candidateArray = [];
								for (let candidate in district) {
									if (candidate == 'Total Votes') continue;
									candidateArray.push({ name: candidate, value: district[candidate] });
								}
								//console.log(candidateArray);
								let candidateQueue = new PriorityQueue(candidateArray, function (a, b) {
									return b.value - a.value;
								});
								let sortedArray = [];
								for (let i = 0; i < module.exports.MaxCandidates - 1 && candidateQueue.length; i++) {
									let candidate = candidateQueue.pop();
									sortedArray.push({ name: candidate.name, votes: candidate.value });
								}
								//console.log(candidateQueue.peek());
								let others = { votes: 0, candidates: {} };
								while (candidateQueue.length) {
									let candidate = candidateQueue.pop();
									others.votes += candidate.value;
									others.candidates[candidate] = {
										candidate: candidate.name,
										votes: candidate.value,
									};
								}
								if (others.votes > 0) sortedArray.push({ name: 'Others', votes: others.votes });
								//console.log(sortedArray);
								for (let i = 0; i < sortedArray.length; i++) {
									candidate = sortedArray[i];
									details +=
										'<tr><th><p class = "ballot-text"><span class = "color-box" ' +
										'style="background-color: ' +
										getCandidateColor(candidate.name) +
										';"></span>\t' +
										candidate.name +
										': </p></th><th>' +
										candidate.votes +
										'</th><th>' +
										Math.round((candidate.votes / district['Total Votes']) * 100) +
										'%</th></tr>';
								}
								details += '</table>';
							}
							if (module.exports.Popups == true) {
								if (Popup == null) {
									//console.log('A wild popup has appeared');
									Popup = new mapboxgl.Popup({
										closeButton: false,
										closeOnClick: false,
										closeOnMove: false,
										maxWidth: 'none',
									})
										.trackPointer()
										.setHTML(details)
										.addTo(map);
								} else {
									Popup.setHTML(details);
								}
								return;
							} else {
								document.getElementById('Data-Box').innerHTML = details;
							}
						} else {
							return;
						}
					}
				}
			}
		});
		map.on('mouseleave', 'election-district-visualization', function (e) {
			if (Popup) {
				Popup.remove();
				Popup = null;
				FocusedDistrict = { elect_dist: 0, mousePos: e.lnglat };
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
	/**
	 * Set the filter for when loading the Overlay file
	 * @param {String} key
	 * @param {Array<Number>} values
	 *
	 * @returns {void}
	 */
	AddOverlayFilter: function (key, values) {
		overlayFilter.propertyTag = key;
		overlayFilter.values = values;
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
		//console.log(geoData);
	},
	addNewOverlayJSON: function (data) {
		console.log(data);
		for (feature in data.features) {
			if (overlayFilter.values.includes(data.features[feature].properties[overlayFilter.propertyTag])) {
				overlayGeoData.features.push(data.features[feature]);
			}
		}
		if (!overlayGeoData.features.length)
			console.warn('Overlay does not contain any features! Verify the filter was set up correctly.');
		return overlayGeoData;
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
		ColorObject.candidates[name] = color;

		this.LoadMap();
		return ColorObject;
	},
	SetPartyColor: function (tag, color) {
		let tagArray = tag.match(/ *\([^)]*\) */g);
		if (tagArray.length) {
			ColorObject.parties[name] = color;
		} else if ((name.includes('(') || name.includes(')')) && !(name.includes('(') && name.includes(')'))) {
			throw new Error(
				'You have formatted the party tag incorrectly please surround the tag in parenthesis or remove the excess ones'
			);
		}
		this.LoadMap();
		return ColorObject;
	},
	SetTagColor: function (tag, color) {
		let tagArray = tag.match(/ *\([^)]*\) */g);
		if (tagArray.length) {
			ColorObject.exceptionTags[name] = color;
		} else if ((name.includes('(') || name.includes(')')) && !(name.includes('(') && name.includes(')'))) {
			throw new Error(
				'You have formatted the exception tag incorrectly please surround the tag in parenthesis or remove the excess ones'
			);
		}
		this.LoadMap();
		return ColorObject;
	},
	DownloadColorData: function () {
		downloadObjectAsJson(ColorObject, 'Candidate Color File');
		return ColorObject;
	},
	DefaultColors: ['#16A085', '#ff8000', '#8524d8', '#1877F2', '#FA4D57'],
	//#endregion
	UseMajorParties: false,
	TagException: true,
	UseGradient: true,
	Popups: true,
	MaxCandidates: 5,
	DistrictRenderSettings: DistrictRenderSettings,
	RenderSettingEnum: RenderSettingEnum,
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
/**
 * Retrieves a color from the color object based on the candidate or tag.
 * @param {String} candidate
 * @example
 * //If UseMajorParties return the democratic tag color
 *
 * getCandidateColor('Bernie Sanders (Democratic)')
 * @returns {String}
 */
function getCandidateColor(candidate) {
	//console.log(candidate)

	if (candidate == 'Others') return '#000000';
	let tagArray = candidate.match(/\([^)]*\) */);
	//console.log(tagArray);
	if (module.exports.TagException) {
		if (tagArray != null && tagArray.length) {
			let color = ColorObject.exceptionTags[tagArray[0]];
			if (color != undefined) return color;
		}
	}
	if (module.exports.UseMajorParties) {
		if (tagArray != null && tagArray.length) {
			let color = ColorObject.parties[tagArray[0]];
			if (color != undefined) {
				return color;
				// if (candidate.includes('Democratic')) return '#0015BC';
				// else if (candidate.includes('Republican')) return '#FF0000';
			}
		}
	}
	if (candidate != 'Total Votes') {
		let mCandidate = candidate.replace(/ *\([^)]*\) */g, '');
		if (ColorObject.candidates[mCandidate] == undefined) {
			if (dcIndex < module.exports.DefaultColors.length) {
				dcIndex++;
				ColorObject.candidates[mCandidate] = module.exports.DefaultColors[dcIndex];
			} else {
				ColorObject.candidates[mCandidate] = getRandomColor();
			}
		}
		return ColorObject.candidates[mCandidate];
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
				filter: [
					'Manually Counted Emergency',
					'Absentee / Military',
					'Federal',
					'Affidavit',
					'Scattered',
					'Absentee/Military',
					'Emergency',
					'Special Presidential',
				],
				conversion: {
					'Public Counter': 'Total Votes',
				},
			};
			for (let row = range.s.r, prefix = {}; row < range.e.r; row++) {
				let name = module.exports.UseMajorParties
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
function lerpCandidateColors(candidateQueue) {
	let candidateA = undefined;
	while (candidateQueue.length) {
		let candidateB = candidateQueue.pop();
		if (candidateA == undefined) {
			candidateA = candidateB;
			continue;
		}
		//console.log(candidateA.color);
		//console.log(candidateB.color);
		//console.log(candidateB.votes - (candidateA.votes * 0.5) / (candidateA.votes + candidateB.votes));
		candidateA = {
			votes: candidateA.votes + candidateB.votes,
			color: lerpColor(
				candidateA.color,
				candidateB.color,
				candidateB.votes / (candidateA.votes + candidateB.votes)
			),
		};
		//console.log(candidateA);
	}
	return candidateA == undefined ? '#C0C0C0' : candidateA.color;
}

class Map {
	constructor() {
		return new mapboxgl.Map({
			container: 'map',
			center: [-73.952319, 40.631056],
			zoom: 9.91,
			hash: true,
			style: style,
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
		let districtsToRemove = [];
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
				if (districtElectionResults[district]['Total Votes'] > 0) {
					let nameResults = new NameBasedResults(districtElectionResults[district]);
					let color;
					if (module.UseGradient) {
						color = lerpCandidateColors(nameResults.toCandidateQueue());
					} else {
						color = nameResults.color;
					}
					opacity = nameResults.highest.votes / districtElectionResults[district]['Total Votes'];
					//console.log(opacity);
					featureData.properties['color'] = color;
					featureData.properties['victory margin'] = opacity;
					featureData.properties['results'] = districtElectionResults[district];
					this.colorExpression.push(district, featureData.properties['color']);
					this.opacityExpression.push(district, featureData.properties['victory margin'] * 0.65);
				} else {
					//console.log(district);
					switch (module.exports.DistrictRenderSettings.ZeroVotes) {
						case RenderSettingEnum.Discarded:
							districtsToRemove.push(district);
							break;
						case RenderSettingEnum.RandomColor:
							featureData.properties['color'] = getRandomColor();
							featureData.properties['victory margin'] = 1;
							featureData.properties['results'] = districtElectionResults[district];
							this.colorExpression.push(district, featureData.properties['color']);
							this.opacityExpression.push(district, featureData.properties['victory margin']);
							break;
						case RenderSettingEnum.Combined:
							featureData.properties['color'] = '#C0C0C0';
							featureData.properties['victory margin'] = 1;
							featureData.properties['results'] = districtElectionResults[district];
							featureData.properties['results'].isCombined = true;
							this.colorExpression.push(district, featureData.properties['color']);
							this.opacityExpression.push(district, featureData.properties['victory margin']);
							break;
					}
				}
			} else {
				switch (module.exports.DistrictRenderSettings.Empty) {
					case RenderSettingEnum.Discarded:
						districtsToRemove.push(district);
						break;
					case RenderSettingEnum.RandomColor:
						featureData.properties['color'] = getRandomColor();
						featureData.properties['victory margin'] = 1;
						this.colorExpression.push(district, featureData.properties['color']);
						this.opacityExpression.push(district, featureData.properties['victory margin']);
						break;
					case RenderSettingEnum.Combined:
						featureData.properties['color'] = '#C0C0C0';
						featureData.properties['victory margin'] = 1;
						featureData.properties['results'].isCombined = true;
						this.colorExpression.push(district, featureData.properties['color']);
						this.opacityExpression.push(district, featureData.properties['victory margin']);
						break;
				}
			}
		}
		this.colorExpression.push('rgba(0,0,0,0)');
		this.opacityExpression.push(0.5);
		geoData.features = geoData.features.filter(function (feature) {
			return !districtsToRemove.includes(feature.properties.elect_dist);
		});
	}
}
class NameBasedResults {
	constructor(districtResults) {
		this.candidates = {};
		this.highest = {
			name: '',
			votes: 0,
		};
		this.isTie = true;
		for (let candidate in districtResults) {
			if (candidate == 'Total Votes') continue;
			let mCandidate = candidate.replace(/ *\([^)]*\) */g, '');
			if (this.candidates[mCandidate] == undefined) {
				this.candidates[mCandidate] = {
					votes: districtResults[candidate],
					color: getCandidateColor(candidate),
				};
			} else {
				this.candidates[mCandidate].votes += districtResults[candidate];
			}
			if (this.candidates[mCandidate].votes > this.highest.votes) {
				this.highest.name = mCandidate;
				this.highest.votes = this.candidates[mCandidate].votes;
			}
		}
		for (let candidate in this.candidates) {
			if (this.candidates[candidate].votes == this.highest.votes) this.isTie = this.isTie && true;
			else this.isTie = this.isTie && false;
		}
		this.highest.votes = this.candidates[this.highest.name].votes;
		//console.log(this.isTie);
		this.color = this.isTie
			? lerpCandidateColors(this.toCandidateQueue())
			: this.candidates[this.highest.name].color;
	}
}
NameBasedResults.prototype.toCandidateQueue = function () {
	let candidateArray = [];
	for (let candidate in this.candidates) {
		if (candidate == 'Total Votes') continue;
		candidateArray.push({
			name: candidate,
			color: this.candidates[candidate].color,
			votes: this.candidates[candidate].votes,
		});
	}
	let candidateQueue = new PriorityQueue(candidateArray, function (a, b) {
		return b.votes - a.votes;
	});
	return candidateQueue;
};
