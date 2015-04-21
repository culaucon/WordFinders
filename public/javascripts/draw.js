const N = 12;
const SIZE = 480;
const FILE_PATH = "words.txt";
const dx = [-1, -1, -1, 0, 1, 1, 1, 0];
const dy = [-1, 0, 1, 1, 1, 0, -1, -1];
const FADING_TIME = 1000;
const PUZZLE_TIME = 1000 * 60; // 1 minute
const INTERVAL = 10;
const DANGER_TIME = 1000 * 10; // 10 seconds
const SHOW_CYCLE = 90;
const HIDE_CYCLE = 10;

var canvas, context;
var puzzle, words, solution;
var solutionParams, numFound, stringToID;
var initX = -1, initY = -1, finalX, finalY, dir, centerX, centerY, unit, len, angle;
var mouseUp = true;
var wordDisplay, string;
var username;
var counter, timeLeft;
var opponent, reply;
var toDetachListener;

function storeOpponent(opp) {
	opponent = opp;
}

function storeReply(rep) {
	reply = rep;
}

function getCoordinates(event) {
	var x = parseInt((event.clientY - canvas.getBoundingClientRect().top) / (SIZE / N));
	var y = parseInt((event.clientX - canvas.getBoundingClientRect().left) / (SIZE / N));
	return [x, y];
}

function initializeCanvas() {
	canvas = document.getElementById("puzzle");
	context = canvas.getContext("2d");
	
	$("#puzzle").on("mousedown", function(event) {
		var coordinates = getCoordinates(event);
		initX = coordinates[0];
		initY = coordinates[1];
	});

	$("#puzzle").on("mousemove", function(event) {
		if (initX === -1 || initY === -1 || mouseUp) return;
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
		drawRect(centerX, centerY, angle, len, unit, false);
		drawBoard();
	});

	$("#puzzle").on("mouseup", function(event) {
		if (initX === -1 || initY === -1) return;
		context.clearRect(0, 0, SIZE, SIZE);
		drawSolution();
		drawBoard();
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
	var num_to_find = 0;
	numFound = 0;
	for (var i = 0; i < words.length; i++) {
		if (!solution[i]) {
			num_to_find++;
			$("#to-find").append("<span id=word-" + i + ">" + words[i] + "<br/></span>");
		} else {
			numFound++;
			$("#found").append("<span class='found' id=word-" + i + ">" + words[i] + "<br/></span>");
		}
	}
	$("#num_to_find").html(num_to_find);
	$("#num_found").html(numFound);
}

function getCookie(name) {
	var value = "; " + document.cookie;
	var parts = value.split("; " + name + "=");
	if (parts.length == 2) return parts.pop().split(";").shift();
}

function detachListeners() {
	$("#puzzle").off("mousedown");
	$("#puzzle").off("mouseover");
	$("#puzzle").off("up");
	$(document).off("mousedown");
	$(document).off("mouseup");
	wordDisplay.hide();
}

function doneWithPuzzle() {
	if (!mouseUp) {
		toDetachListener = true;
	} else {
		detachListeners();
	}
	if (!username || !opponent) {
		alert("Congratulations, you have found all the words!");
		return;
	} else {
		$.ajax({
			type: "POST",
			url: "/finalize",
			data: {
				username: username,
				opponent: opponent,
				reply: reply
			},
			success: function(data) {
				alert(data);
			}
		});
	}
}

function checkWithServer(word_id, cb) {
	$.ajax({
		type: "POST",
		url: "/submit-solution",
		data: {
			username: username,
			opponent: opponent,
			solution: JSON.stringify({
				init_x: initX,
				init_y: initY,
				dir: dir,
				word_id: word_id
			}),
			time_left: timeLeft,
			reply: reply
		},
		success: function(data) {
			cb(data);
		}
	});
}

function initializePuzzle() {
	if (opponent) {
		// Challenge mode
		$.ajax({
			type: "POST",
			url: "/gen-puzzle-challenge",
			data: {
				opponent: opponent,
				reply: reply
			},
			success: function(data) {
				if (data.message && data.redirect) {
					$("body").empty();
					alert(data.message);
					window.location.replace(data.redirect);
					return;
				}
				puzzle = data.puzzle.grid;
				words = data.puzzle.words;
				solution = new Array(words.length);
				solutionParams = new Array(words.length);


				if (data.sol) {
					console.log(data.sol);
					solution = JSON.parse(data.sol);
					for (var i = 0; i < solution.length; i++)
						if (solution[i]) {
							solutionParams[i] = {
								centerX: (solution[i].init_y + 0.5) * SIZE / N,
								centerY: (solution[i].init_x + 0.5) * SIZE / N,
								angle: ((solution[i].dir === 7) ? 4 : (solution[i].dir - 3)) * Math.PI / 4,
								length: words[i].length - 1,
								unit: SIZE / N * ((solution[i].dir % 2 === 0) ? Math.sqrt(2) : 1)
							}
						}
				}

				initializeDocument();
				initializeCanvas();
				initializeTimer(data.time_left);

				stringToID = {};
				for (var i = 0; i < words.length; i++) stringToID[words[i]] = i + 1;
				numFound = 0;
				drawSolution();
				drawBoard();
				updateLists();
			}
		});
	} else {
		// Practice mode
		$.ajax({
			type: "POST",
			url: "/gen-puzzle-practice",
			success: function(data) {
				puzzle = data.grid;
				words = data.words;

				initializeDocument();
				initializeCanvas();
				initializeTimer();

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
}

function addToSolution(id) {
	numFound++;
	solution[id] = {
		initX: initX,
		initY: initY,
		dir: dir
	}
	solutionParams[id] = {
		centerX: centerX,
		centerY: centerY,
		angle: angle,
		length: len,
		unit: unit
	}
	updateLists();
}

function initializeDocument() {
	toDetachListener = false;
	wordDisplay = $("#word-display");
	username = getCookie("username");
	$(document).on("mouseup", function(e) {
		if (toDetachListener) detachListeners();
		if (stringToID[string]) {
			var i = stringToID[string] - 1;
			if (!solutionParams[i]) {
				addToSolution(i);
				if (!username || !opponent) {
				} else {
					checkWithServer(i, function(data) {
					});
				}
			}
			wordDisplay.html(string);
			wordDisplay.stop(true, true);
			wordDisplay.show();
			wordDisplay.removeAttr("class").addClass("positive");
			wordDisplay.fadeOut(FADING_TIME, function() {
				wordDisplay.html("");
				wordDisplay.show();
			});

			if (numFound === words.length) {
				clearInterval(counter);
				doneWithPuzzle();
			}
		} else {
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
		initX = -1;
		initY = -1;
		string = "";
	});
	$(document).on("mousedown", function(e) {
		mouseUp = false;
	});
}

function initializeTimer(time_left) {
	if (!opponent) return; // Practice mode, unlimited timing

	var timer = $("#timer");
	if (typeof time_left !== "undefined") timeLeft = time_left * 100;
	else timeLeft = PUZZLE_TIME / INTERVAL;
	var cnt = 0;
	counter = setInterval(
		function() {
			if (timeLeft <= 0) {
				timer.css("visiblility", "hidden");
				clearInterval(counter);
				doneWithPuzzle();
			} else {
				timeLeft--;
				var sec = parseInt(timeLeft * INTERVAL / 1000);
				if (timeLeft < DANGER_TIME / INTERVAL) {
					timer.css("color", "red");
					if (cnt < SHOW_CYCLE - 1) {
						timer.css("visibility", "visible");
					} else {
						timer.css("visibility", "hidden");
					}
					cnt = (cnt + 1) % (SHOW_CYCLE + HIDE_CYCLE);
				}
				timer.html(sec);
			}
		},
		INTERVAL
	);
}

$(function() {
	initializePuzzle();
})
