const N = 12;
const SIZE = 480;
const FILE_PATH = "words.txt";
const dx = [-1, -1, -1, 0, 1, 1, 1, 0];
const dy = [-1, 0, 1, 1, 1, 0, -1, -1];
const POSITIVE = ["NICE", "AWESOME", "COOL", "GOOD JOB", "WELL DONE", "WELL PLAYED"];
const FADING_TIME = 1000;
const TIME_PENALTY = 0;

var canvas;
var context;
var puzzle, words, solution;
var solutionParams;
var numFound;
var stringToID;
var initX = -1, initY = -1, finalX, finalY, dir, centerX, centerY, unit, len, angle;
var mouseUp = true;
var wordDisplay;
var lastTime = 0;
var username;
var string;

function getCoordinates(event) {
	var x = parseInt((event.clientY - canvas.getBoundingClientRect().top) / (SIZE / N));
	var y = parseInt((event.clientX - canvas.getBoundingClientRect().left) / (SIZE / N));
	return [x, y];
}

function initializeCanvas() {
	canvas = document.getElementById("puzzle");
	context = canvas.getContext("2d");
	
	canvas.addEventListener("mousedown", function(event) {
		if ((new Date()).getTime() - lastTime <= TIME_PENALTY) return;
		var coordinates = getCoordinates(event);
		initX = coordinates[0];
		initY = coordinates[1];
	});

	canvas.addEventListener("mousemove", function(event) {
		if (initX === -1 || initY === -1 || mouseUp) return;
		if ((new Date()).getTime() - lastTime <= TIME_PENALTY) return;
		var coordinates = getCoordinates(event);
		var x = coordinates[0], y = coordinates[1];
		centerX = (initY + 0.5) * SIZE / N;
		centerY = (initX + 0.5) * SIZE / N;
		angle = Math.atan2(event.clientY - canvas.getBoundingClientRect().top - centerY, event.clientX - canvas.getBoundingClientRect().left - centerX);
		var dist = Math.abs(Math.hypot((x - initX) * SIZE / N, (y - initY) * SIZE / N));
		
		// Adjust the angle to the nearest multiple of Math.PI / 4
		var ret = angle, best = 1000000, t = -4;
		for (var i = -4; i <= 4; i++)
			if (best > Math.abs(i * Math.PI / 4 - angle)) {
				if (i === -4) ret = Math.PI;
				else ret = i * Math.PI / 4;
				best = Math.abs(i * Math.PI / 4 - angle);
				t = i;
				if (i % 2 === 0) {
					unit = SIZE / N;
				} else {
					unit = SIZE / N * Math.sqrt(2);
				}
			}
		angle = ret;

		// Calculate number of cells highlighted
		len = parseInt(dist / unit);
		if (dist / unit - len * dist >= 0.5) len++;
		var maxCells = -1, tx = initX, ty = initY;
		string = "";
		dir = (t + 11) % 8;
		while (tx >= 0 && tx < N && ty >= 0 && ty < N) {
			if (maxCells < len) {
				string += puzzle[tx][ty];
			}
			maxCells++;
			tx += dx[dir];
			ty += dy[dir];
		}
		if (len > maxCells) len = maxCells;
		if (len === 0) {
			angle = 0;
			unit = SIZE / N;
		}
		finalX = initX + len * dx[dir];
		finalY = initY + len * dy[dir];
		
		wordDisplay.stop(true, true);
		wordDisplay.show();
		wordDisplay.html(string);
		wordDisplay.removeAttr("class").addClass("normal");
		
		drawSolution();
		//context.clearRect(0, 0, SIZE, SIZE);
		drawRect(centerX, centerY, angle, len, unit, false);
		drawBoard();
	});

	canvas.addEventListener("mouseup", function(event) {
		if (initX === -1 || initY === -1) return;
		context.clearRect(0, 0, SIZE, SIZE);
		drawSolution();
		drawBoard();
		initX = -1;
		initY = -1;
	});
	
}

function drawRect(centerX, centerY, angle, len, unit, isSolution) {
	context.translate(centerX, centerY);
	context.rotate(angle);
	context.beginPath();
	if (isSolution) {
		context.fillStyle = "magenta";
	} else {
		context.fillStyle = "yellow";
	}
	context.rect(- SIZE / N / 2, - SIZE / N / 4, len * unit + SIZE / N, SIZE / N / 2);
	context.fill();
	context.stroke();
	context.rotate(-angle);
	context.translate(-centerX, -centerY);
}

function initializePuzzle() {
	$.ajax({
		type: "POST",
		url: "/gen-puzzle",
		success: function (data) {
			puzzle = data.grid;
			words = data.words;
			solution = new Array(words.length);
			solutionParams = new Array(words.length);
			stringToID = {};
			for (var i = 0; i < words.length; i++) stringToID[words[i]] = i + 1;
			numFound = 0;
			drawSolution();
			drawBoard();
			updateLists();
		}
	});
}

function drawSolution() {
	context.clearRect(0, 0, SIZE, SIZE);
	for (var i = 0; i < solutionParams.length; i++)
		if (solutionParams[i]) {
			drawRect(
				solutionParams[i].centerX,
				solutionParams[i].centerY,
				solutionParams[i].angle,
				solutionParams[i].length,
				solutionParams[i].unit,
				true
			);
		}
}

function drawBoard() {
	drawSolution();
	
	context.fillStyle = "black";
	context.beginPath();
	context.rect(0, 0, SIZE, SIZE);
	context.stroke();

	context.textBaseline = "top";
	context.textAlign = "center";
	context.font = "30px Arial";
	for (var i = 5; i < SIZE; i += SIZE / N) {
		for (var j = 20; j < SIZE; j += SIZE / N) {
			var ch = puzzle[(i - 5) / (SIZE / N)][(j - 20) / (SIZE / N)].toUpperCase();
			context.fillText(ch, j, i);
		}
	}
	
}

function updateLists() {
	$("#to-find").find("span").remove();
	$("#found").find("span").remove();
	var num_to_find = 0, num_found = 0;
	for (var i = 0; i < words.length; i++) {
		if (!solution[i]) {
			num_to_find++;
			$("#to-find").append("<span id=word-" + i + ">" + words[i] + "<br/></span>");
		} else {
			num_found++;
			$("#found").append("<span class='found' id=word-" + i + ">" + words[i] + "<br/></span>");
		}
	}
	$("#num_to_find").html(num_to_find);
	$("#num_found").html(num_found);
}

function sendSolutionToServer() {
	$.ajax({
		type: "POST",
		url: "/check-solution",
		data: {
			username: "clquang",
			solution: solution
		},
		success: function (data) {
		}
	});
}

$(function() {
	initializeCanvas();
	initializePuzzle();
	wordDisplay = $("#word-display");
	document.addEventListener("mouseup", function(e) {
		if (stringToID[string]) {
			var i = stringToID[string] - 1;
			if (!solutionParams[i]) {
				numFound++;
				solution[i] = {
					initX: initX,
					initY: initY,
					dir: dir
				}
				solutionParams[i] = {
					centerX: centerX,
					centerY: centerY,
					angle: angle,
					length: len,
					unit: unit
				}
				updateLists();
			}
			wordDisplay.html(string);
			wordDisplay.stop(true, true);
			wordDisplay.show();
			lastTime = (new Date()).getTime();
			wordDisplay.removeAttr("class").addClass("positive");
			wordDisplay.fadeOut(FADING_TIME, function() {
				wordDisplay.html("");
				wordDisplay.show();
			});

			if (numFound === words.length) {
				sendSolutionToServer();
			}
		} else {
			if (wordDisplay.html() !== "") {
				lastTime = (new Date()).getTime();
			}
			wordDisplay.stop(true, true);
			wordDisplay.show();
			if (wordDisplay.hasClass("normal")) wordDisplay.removeAttr("class").addClass("negative");
			wordDisplay.fadeOut(FADING_TIME, function() {
				wordDisplay.html("");
				wordDisplay.show();
			});
		}
		mouseUp = true;
		context.clearRect(0, 0, SIZE, SIZE);
		drawSolution();
		drawBoard();
	});
	document.addEventListener("mousedown", function(e) {
		mouseUp = false;
	});
})
