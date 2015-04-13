var fs = require("fs");

const NUM_WORDS = 15;
const N = 12;
const SIZE = 480;
const FILE_PATH = "./words.txt";
const dx = [-1, -1, -1, 0, 1, 1, 1, 0];
const dy = [-1, 0, 1, 1, 1, 0, -1, -1];

var generatePuzzle = function() {
	var puzzle;
	var list;
	
	function generate(words) {
		puzzle = new Array(N);
		for (var i = 0; i < N; i++) {
			puzzle[i] = new Array(N);
			for (var j = 0; j < N; j++) {
				puzzle[i][j] = ' ';
			}
		}
	
		var n = words.length;
		var chosen = new Array(n);
		list = new Array();
	
		for (var cnt = 0; cnt < NUM_WORDS; cnt++) {
			while (true) {
				var k = parseInt(Math.random() * n);
				if (words[k].length < 3 || words[k].length > N || chosen[k]) continue;
				var ok = true;
				for (var i = 0; i < cnt; i++) {
					if (list[i].indexOf(words[k]) != -1 || words[k].indexOf(list[i]) != -1) ok = false;
				}
				if (!ok) continue;
				
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
				list.push(words[k].toUpperCase());
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
				} else {
					puzzle[i][j] = puzzle[i][j].toUpperCase();
				}
	}

	generate(fs.readFileSync(FILE_PATH, "utf8").split("\n"));
	
	var data = {
		grid: puzzle,
		words: list.sort()
	}
	return data;
}

var generatePuzzleChallenge = function(query, username, opponent, reply, cb) {
	query("SELECT EXTRACT(EPOCH FROM NOW()) AS current_time", function(err, rows, result) {
		if (err) {
			return console.error('error running query', err);
		}
		var current_time = rows[0].current_time;

		if (!reply) {
			query("SELECT *, EXTRACT(EPOCH FROM user_time) AS time FROM challenges WHERE username = $1 AND opponent = $2", [username, opponent], function(err, rows, result) {
				if (err) {
					return console.error('error running query', err);
				}

				if (rows[0] && rows[0].username) {
					// On-going puzzle
					var time_left = current_time - rows[0].time;
					console.log("current time = " + current_time);
					console.log("start time = " + rows[0].time);
					console.log("time left = " + time_left);
					if (time_left > 60) {
						// Time limit exceeded
						time_left = 0;
					} else {
						time_left = 60 - time_left;
					}
					var puzzle = {
						puzzle: JSON.parse(rows[0].puzzle),
						time_left: time_left
					}
					cb("old", puzzle);
				} else {
					var data = generatePuzzle();
					query("INSERT INTO challenges (username, opponent, user_time, puzzle) VALUES ($1, $2, NOW(), $3)", [username, opponent, JSON.stringify(data)], function(err, rows, result) {
						if (err) {
							return console.error('error running query', err);
						}
						cb("new", data);
					});
				}
			});
		} else {
			query("SELECT *, EXTRACT(EPOCH FROM opponent_time) AS time FROM challenges WHERE username = $1 AND opponent = $2", [opponent, username], function(err, rows, result) {
				if (err) {
					return console.error('error running query', err);
				}

				if (!rows[0].time) {
					// First time accessing this puzzle
					query("UPDATE challenges SET opponent_time = NOW() WHERE username = $1 AND opponent = $2", [opponent, username], function(err, rows, result) {
						if (err) {
							return console.error('error running query', err);
						}
					});
					var puzzle = {
						puzzle: JSON.parse(rows[0].puzzle),
						time_left: 60
					}
					cb("old", puzzle);
				} else if (rows[0] && rows[0].username) {
					// On-going puzzle
					var time_left = current_time - rows[0].time;
					console.log("current time = " + current_time);
					console.log("start time = " + rows[0].time);
					console.log("time left = " + time_left);
					if (time_left > 60) {
						// Time limit exceeded
						time_left = 0;
					} else {
						time_left = 60 - time_left;
					}
					var puzzle = {
						puzzle: JSON.parse(rows[0].puzzle),
						time_left: time_left
					}
					cb("old", puzzle);
				} else {
					console.log("error, existing puzzle must have been found");
				}
			});
		}
	});
}

var countScore = function(grid, words, solution) {
	var ret = 0;
	for (var i = 0; i < solution.length; i++)
		if (solution[i]) {
			var x = solution[i].initX, y = solution[i].initY, dir = solution[i].dir;
			var cur = 0, len = words[i].length;
			while (true) {
				if (x < 0 || x >= N || y < 0 || y >= N || cur >= len || grid[x][y] !== words[i][cur]) break;
				x += dx[dir];
				y += dy[dir];
				cur++;
			}
			if (cur >= len) ret++;
		}
	return ret;
}

var insertUserScore = function(query, username, opponent, score) {
	query("UPDATE challenges SET first_score = $1 WHERE username = $2 and opponent = $3", [score, username, opponent], function(err, rows, result) {
		if (err) {
			return console.error('error while updating user score');
		}
	});
}

var insertOpponentScore = function(query, username, opponent, score) {
	query("UPDATE challenges SET second_score = $1 WHERE username = $2 and opponent = $3", [score, username, opponent], function(err, rows, result) {
		if (err) {
			return console.error('error while updating opponent score');
		}
	});
}

var updateResult = function(query, username, opponent, first_score, second_score) {
	query("SELECT * FROM results WHERE username = $1", [username], function(err, rows, results) {
		if (err) {
			return console.error('error running query', err);
		}
		
		var func = function(recent) {
			for (var i = 4; i > 0; i--)
				recent[i] = recent[i - 1];

			recent[0] = {
				opponent: opponent,
				verdict: (first_score === second_score) ? 2 : (first_score > second_score) ? 0 : 1 // win: 0, lose: 1, draw: 2
			}

			query("UPDATE results SET recent = $1 WHERE username = $2", [JSON.stringify(recent), username], function(err, rows, resuls) {
				if (err) {
					return console.error('error running query', err);
				}
			});
		}

		if (!rows[0] || !rows[0].username) {
			// This user is not yet in the table
			var recent = new Array(5);
			query("INSERT INTO results (username, recent) VALUES ($1, $2)", [username, JSON.stringify(recent)], function(err, rows, result) {
				if (err) {
					return console.error('error running query', err);
				}
				func(recent);
			});
		} else {
			func(JSON.parse(rows[0].recent));
		}
	})
}

var submitSolution = function(query, username, opponent, solution, time_left, reply, cb) {
	query("SELECT EXTRACT(EPOCH FROM NOW()) AS time", function(err, rows, result) {
		var current_timestamp = rows[0].time;

		if (!reply) {
			query("SELECT *, EXTRACT(EPOCH FROM user_time) AS time FROM challenges WHERE username = $1 AND opponent = $2", [username, opponent], function(err, rows, results) {
				if (err) {
					return console.error('error running query', err);
				}
				if (!rows[0] || !rows[0].puzzle) {
					return console.error('error puzzle not found');
				}

				var puzzle_data = JSON.parse(rows[0].puzzle);
				var grid = puzzle_data.grid, words = puzzle_data.words;
				var last_timestamp = rows[0].time, time_diff = current_timestamp - last_timestamp + time_left / 100. - 60;

				console.log(current_timestamp, last_timestamp);
				console.log("solution, time diff = " + time_diff);
				if (time_diff <= 10) {
					var score = countScore(grid, words, solution);
					cb("Your score: " + score + ".");
					insertUserScore(query, username, opponent, score);
				} else {
					cb("Timing doesn't match. Match forfeited.\nYour score: 0.");
					insertUserScore(query, username, opponent, 0);
				}
			});
		} else {
			query("SELECT *, EXTRACT(EPOCH FROM opponent_time) AS time FROM challenges WHERE username = $1 AND opponent = $2", [opponent, username], function(err, rows, results) {
				if (err) {
					return console.error('error running query', err);
				}
				if (!rows[0] || !rows[0].puzzle) {
					return console.error('error puzzle not found');
				}

				var puzzle_data = JSON.parse(rows[0].puzzle);
				var grid = puzzle_data.grid, words = puzzle_data.words;
				var last_timestamp = rows[0].time, time_diff = current_timestamp - last_timestamp + time_left / 100. - 60;

				var other_score = rows[0].first_score, score = 0;
				var str = "";

				if (time_diff <= 10) {
					score = countScore(grid, words, solution);
					insertOpponentScore(query, username, opponent, score);
				} else {
					str = "Timing doesn't match. Match forfeited.\n";
					insertOpponentScore(query, username, opponent, 0);
				}
				str += "Your score: " + score + ". Friend's score: " + other_score + ". Result: ";
				var verdict;
				if (score > other_score) {
					str += "You win.";
					verdict = 0;
				} else if (score < other_score) {
					str += "You lose.";
					verdict = 1;
				} else {
					str += "Draw.";
					verdict = 2;
				}

				updateResult(query, username, opponent, score, other_score);
				updateResult(query, opponent, username, other_score, score);
				query("DELETE FROM challenges WHERE username = $1 AND opponent = $2", [opponent, username], function(err, rows, results) {
					if (err) {
						return console.error('error running query', err);
					}
				});
				cb(str, verdict);
			});
		}
	});
}

var searchChallenges = function(query, username, cb) {
	query("SELECT * FROM challenges WHERE opponent = $1 and second_score IS NULL", [username], function(err, rows, results) {
		if (err) {
			return console.error('error running query', err);
		}
		var challenges_list = [], unanswered_list = [];
		if (rows && rows.length) {
			for (var i = 0; i < rows.length; i++)
				if (rows[i] && rows[i].puzzle) {
					challenges_list.push(rows[i].username);
				}
		}
		query("SELECT * FROM challenges WHERE username = $1 AND second_score IS NULL", [username], function(err, rows, results) {
			if (rows && rows.length) {
				for (var i = 0; i < rows.length; i++)
					if (rows[i] && rows[i].puzzle) {
						unanswered_list.push(rows[i].opponent);
					}
			}
			cb(challenges_list, unanswered_list);
		})
	});
}

var searchResults = function(query, username, cb) {
	query("SELECT * FROM results WHERE username = $1", [username], function(err, rows, results) {
		if (err) {
			return console.error('error running query', err);
		}
		console.log(rows);
		if (!rows[0] || !rows[0].username) {
			var recent = new Array(5);
			query("INSERT INTO results (username, recent) VALUES ($1, $2)", [username, JSON.stringify(recent)], function(err, rows, result) {
				if (err) {
					return console.error('error running query', err);
				}
				cb(recent);
			});
		} else {
			cb(JSON.parse(rows[0].recent));
		}
	});
}

module.exports = {
	generatePuzzle: generatePuzzle,
	generatePuzzleChallenge: generatePuzzleChallenge,
	submitSolution: submitSolution,
	searchChallenges: searchChallenges,
	searchResults: searchResults
}