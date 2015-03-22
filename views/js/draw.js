const NUM_WORDS = 15;
const N = 12;
const SIZE = 480;
const FILE_PATH = "words.txt";
const dx = [-1, -1, -1, 0, 1, 1, 1, 0];
const dy = [-1, 0, 1, 1, 1, 0, -1, -1];

var canvas;
var context;
var puzzle;
var initX = -1, initY = -1;

function getCoordinates(event) {
	var x = parseInt((event.clientY - canvas.getBoundingClientRect().top) / (SIZE / N));
	var y = parseInt((event.clientX - canvas.getBoundingClientRect().left) / (SIZE / N));
	return [x, y];
}

function initializeCanvas() {
	canvas = document.getElementById("puzzle");
	context = canvas.getContext("2d");
	
	canvas.addEventListener("mousedown", function(event) {
		var coordinates = getCoordinates(event);
		initX = coordinates[0];
		initY = coordinates[1];
	});

	canvas.addEventListener("mousemove", function(event) {
		if (initX === -1 || initY === -1) return;
		var coordinates = getCoordinates(event);
		var x = coordinates[0], y = coordinates[1];
		var centerX = (initY + 0.5) * SIZE / N, centerY = (initX + 0.5) * SIZE / N;
		var angle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
		var dist = Math.abs(Math.hypot((x - initX) * SIZE / N, (y - initY) * SIZE / N));
		var unit;
		
		// Adjust the angle to the nearest multiple of Math.PI / 4
		var ret = angle, best = 1000000, t = -3;
		for (var i = -3; i <= 4; i++)
			if (best > Math.abs(i * Math.PI / 4 - angle)) {
				ret = i * Math.PI / 4;
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
		while (tx >= 0 && tx < N && ty >= 0 && ty < N) {
			maxCells++;
			tx += dx[t + 3];
			ty += dy[t + 3];
		}
		if (k > maxCells) k = maxCells;
		if (k === 0) {
			angle = 0;
			unit = SIZE / N;
		}
		
		context.clearRect(0, 0, SIZE, SIZE);
		context.translate(centerX, centerY);
		context.rotate(angle);
		context.beginPath();
		context.fillStyle = "blue";
		context.rect(- SIZE / N / 2, - SIZE / N / 2, k * unit + SIZE / N, SIZE / N);
		context.fill();
		context.stroke();
		context.rotate(-angle);
		context.translate(-centerX, -centerY);
		drawPuzzle();
	});

	canvas.addEventListener("mouseup", function(event) {
		if (initX === -1 || initY === -1) return;
		var coordinates = getCoordinates(event);
		var x = coordinates[0], y = coordinates[1];
		context.clearRect(0, 0, SIZE, SIZE);
		drawPuzzle();
		initX = -1;
		initY = -1;
	});
}

function initializePuzzle(words) {
	var file = new XMLHttpRequest();
	file.open("GET", FILE_PATH, false);
	file.onreadystatechange = function() {
		if (file.readyState === 4) {
			if (file.status === 200 || file.status === 0) {
				generatePuzzle(file.responseText.split("\n"));
				drawPuzzle();
			}
		}
	}
	file.send(null);
}

function generatePuzzle(words) {
	puzzle = new Array(N);
	for (var i = 0; i < N; i++) {
		puzzle[i] = new Array(N);
		for (var j = 0; j < N; j++) {
			puzzle[i][j] = ' ';
		}
	}
	
	var n = words.length;
	var chosen = new Array(n);
	
	for (var cnt = 0; cnt < NUM_WORDS; cnt++) {
		while (true) {
			var k = parseInt(Math.random() * n);
			if (words[k].length < 3 || words[k].length > N || chosen[k]) continue;
			var pos = [];
			for (var i = 0; i < N; i++)
				for (var j = 0 ; j < N; j++)
					for (var dir = 0; dir < 8; dir++) {
						var x = i, y = j, cur = 0;
						while (cur < words[k].length) {
							if (x < 0 || x >= N || y < 0 || y >= N || (puzzle[x][y] != ' ' && puzzle[x][y] != words[k][cur])) break;
							x += dx[dir];
							y += dy[dir];
							cur++;
						}
						if (cur == words[k].length) {
							pos.push((i * N + j) * 8 + dir);
						}
					}
			if (pos.length == 0) continue;
			var id = parseInt(Math.random() * pos.length);
			var x = parseInt(pos[id] / 8 / N), y = parseInt((pos[id] / 8)) % N, dir = pos[id] % 8;
			for (var cur = 0; cur < words[k].length; cur++, x += dx[dir], y += dy[dir]) {
				puzzle[x][y] = words[k][cur];
			}
			break;
		}
	}
	
	for (var i = 0; i < 12; i++)
		for (var j = 0; j < 12; j++)
			if (puzzle[i][j] === ' ') {
				var t = parseInt(Math.random() * 26);
				puzzle[i][j] = String.fromCharCode(65 + t);
			}
}

function drawPuzzle() {
	context.fillStyle = "black";
	
	context.beginPath();
	context.rect(0, 0, SIZE, SIZE);
	context.stroke();

	context.textBaseline = "top";
	context.textAlign = "center";
	context.font = "30px Arial";
	for (var i = 20; i < SIZE; i += SIZE / N) {
		for (var j = 5; j < SIZE; j += SIZE / N) {
			var ch = puzzle[(i - 20) / (SIZE / N)][(j - 5) / (SIZE / N)].toUpperCase();
			context.fillText(ch, i, j);
		}
	}
}

$(function() {
	initializeCanvas();
	initializePuzzle();
})
