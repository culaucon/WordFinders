const N = 12;
const SIZE = 480;
const FILE_PATH = "words.txt";
const dx = [-1, -1, -1, 0, 1, 1, 1, 0];
const dy = [-1, 0, 1, 1, 1, 0, -1, -1];
const POSITIVE = ["NICE", "AWESOME", "COOL", "GOOD JOB", "WELL DONE", "WELL PLAYED"];
const FADING_TIME = 1000;
const TIME_PENALTY = 1000;

var canvas;
var context;
var puzzle, words, solution;
var solutionParams;
var numFound;
var stringToID;
var initX = -1, initY = -1, finalX, finalY, dir;
var mouseUp = true;
var wordDisplay;
var lastTime = 0;

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
		var centerX = (initY + 0.5) * SIZE / N, centerY = (initX + 0.5) * SIZE / N;
		var angle = Math.atan2(event.clientY - canvas.getBoundingClientRect().top - centerY, event.clientX - canvas.getBoundingClientRect().left - centerX);
		var dist = Math.abs(Math.hypot((x - initX) * SIZE / N, (y - initY) * SIZE / N));
		var unit;
		
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
		var k = parseInt(dist / unit);
		if (dist / unit - k * dist >= 0.5) k++;
		var maxCells = -1, tx = initX, ty = initY;
		var string = "";
		dir = (t + 11) % 8;
		while (tx >= 0 && tx < N && ty >= 0 && ty < N) {
			if (maxCells < k) {
				string += puzzle[tx][ty];
			}
			maxCells++;
			tx += dx[dir];
			ty += dy[dir];
		}
		if (k > maxCells) k = maxCells;
		if (k === 0) {
			angle = 0;
			unit = SIZE / N;
		}
		finalX = initX + k * dx[dir];
		finalY = initY + k * dy[dir];
		
		wordDisplay.html(string);
		wordDisplay.removeAttr("class").addClass("normal");
		
		if (stringToID[string]) {
			var i = stringToID[string] - 1;
			$("#word-" + i).addClass("found");
			numFound++;
			solutionParams[i] = {
				centerX: centerX,
				centerY: centerY,
				angle: angle,
				length: k,
				unit: unit
			}
			wordDisplay.html(string);
			lastTime = (new Date()).getTime();
			wordDisplay.removeAttr("class").addClass("positive");
			wordDisplay.fadeOut(FADING_TIME, function() {
				wordDisplay.html("");
				wordDisplay.show();
			});
		}

		context.clearRect(0, 0, SIZE, SIZE);
		drawRect(centerX, centerY, angle, k, unit, false);
		drawBoard();
	});

	canvas.addEventListener("mouseup", function(event) {
		if (initX === -1 || initY === -1) return;
		context.clearRect(0, 0, SIZE, SIZE);
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
		context.fillStyle = "green";
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
			drawBoard();
			drawList();
		}
	});
}

function drawSolution() {
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

function drawList() {
	var list = $("#list");
	for (var i = 0; i < words.length; i++) {
		list.append("<span id=word-" + i + ">" + words[i] + "</span><br/>");
	}
}

$(function() {
	initializeCanvas();
	initializePuzzle();
	wordDisplay = $("#word-display");
	document.addEventListener("mouseup", function(e) {
		if (wordDisplay.html() !== "") {
			lastTime = (new Date()).getTime();
		}
		if (wordDisplay.hasClass("normal")) wordDisplay.removeAttr("class").addClass("negative");
		wordDisplay.fadeOut(FADING_TIME, function() {
			wordDisplay.html("");
			wordDisplay.show();
		});
		mouseUp = true;
		context.clearRect(0, 0, SIZE, SIZE);
		drawBoard();
	});
	document.addEventListener("mousedown", function(e) {
		mouseUp = false;
	});
})
