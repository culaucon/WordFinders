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
		var total_length = 0;
	
		for (var cnt = 0; cnt < NUM_WORDS; cnt++) {
			while (true) {
				var k = parseInt(Math.random() * n);
				if (words[k].length < 3 || words[k].length > N || chosen[k] || total_length + words[k].length > 6 * (cnt + 1)) continue;
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
				chosen[k] = true;
				total_length += words[k].length;
				list.push(words[k].toUpperCase());
				var id = parseInt(Math.random() * pos.length);
				var x = parseInt(pos[id] / 8 / N), y = parseInt((pos[id] / 8)) % N, dir = pos[id] % 8;
				for (var cur = 0; cur < words[k].length; cur++, x += dx[dir], y += dy[dir]) {
					puzzle[x][y] = words[k][cur];
				}
				break;
			}
		}
console.log(puzzle);
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
	list = list.sort();

	var data = {
		grid: puzzle,
		words: list
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

					if (time_left > 60) {
						// Time limit exceeded
						time_left = 0;
					} else {
						time_left = 60 - time_left;
					}
					var puzzle = {
						puzzle: JSON.parse(rows[0].puzzle),
						time_left: time_left,
						sol: rows[0].user_sol
					}
					cb("old", puzzle);
				} else {
					var data = generatePuzzle();
					query("INSERT INTO challenges (username, opponent, user_time, puzzle, user_sol, opponent_sol, user_score, opponent_score) VALUES ($1, $2, NOW(), $3, $4, $5, 0, 0)",
						[username, opponent, JSON.stringify(data), JSON.stringify(new Array(NUM_WORDS)), JSON.stringify(new Array(NUM_WORDS))], function(err, rows, result) {
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

				if (!rows[0]) {
					return console.error('puzzle does not exist');
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

					if (time_left > 60) {
						// Time limit exceeded
						time_left = 0;
					} else {
						time_left = 60 - time_left;
					}
					var puzzle = {
						puzzle: JSON.parse(rows[0].puzzle),
						time_left: time_left,
						sol: rows[0].opponent_sol
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

var updateResult = function(query, username, opponent, first_score, second_score) {
	query("SELECT * FROM results WHERE username = $1", [username], function(err, rows, results) {
		if (err) {
			return console.error('error running query', err);
		}
		
		var func = function(recent) {
			for (var i = 4; i > 0; i--)
				recent[i] = recent[i - 1];

			var verdict = 2;
			if (first_score > second_score) verdict = 0;
			else if (first_score < second_score) verdict = 1;

			recent[0] = {
				opponent: opponent,
				verdict: verdict // win: 0, lose: 1, draw: 2
			}

			query("UPDATE results SET recent = $1 WHERE username = $2", [JSON.stringify(recent), username], function(err, rows, results) {
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

var updateScore = function(query, grid, words, solution, username, opponent, reply, cb) {
	var check = function() {
		var x = solution.init_x, y = solution.init_y, dir = solution.dir, i = solution.word_id;
		var cur = 0, len = words[i].length;
		while (true) {
			if (x < 0 || x >= N || y < 0 || y >= N || cur >= len || grid[x][y] !== words[i][cur]) break;
			x += dx[dir];
			y += dy[dir];
			cur++;
		}
		if (cur >= len) return true;
		return false;
	}
	if (!reply) {
		query("SELECT * FROM challenges WHERE username = $1 and opponent = $2", [username, opponent], function(err, rows, result) {
			if (err) {
				return console.error('error while updating user score');
			}
			if (!rows[0]) {
				return console.log('error puzzle not found');
			}
			var sol = JSON.parse(rows[0].user_sol), score = rows[0].user_score || 0;
			if (sol[solution.word_id]) return false;
			if (check()) {
				sol[solution.word_id] = solution;
				score++;
				query("UPDATE challenges SET (user_sol, user_score) = ($1, $2) WHERE username = $3 and opponent = $4", [JSON.stringify(sol), score, username, opponent], function(err, rows, result) {
					if (err) {
						return console.error('error while updating user score');
					}
				});
				cb(true);
			} else cb(false);
		});
	} else {
		query("SELECT * FROM challenges WHERE username = $1 and opponent = $2", [opponent, username], function(err, rows, result) {
			if (err) {
				return console.error('error while updating opponent score');
			}
			if (!rows[0]) {
				return console.log('error puzzle not found');
			}
			var sol = JSON.parse(rows[0].opponent_sol), score = rows[0].opponent_score || 0;
			if (sol[solution.word_id]) return false;
			if (check()) {
				sol[solution.word_id] = solution;
				score++;
				query("UPDATE challenges SET (opponent_sol, opponent_score) = ($1, $2) WHERE username = $3 and opponent = $4", [JSON.stringify(sol), score, opponent, username], function(err, rows, result) {
					if (err) {
						return console.error('error while updating opponent score');
					}
				});
				cb(true);
			} else cb(false);
		});
	}
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
				var last_timestamp = rows[0].time, time_diff = current_timestamp - last_timestamp - 60;

				if (time_diff <= 0) {
					updateScore(query, grid, words, solution, username, opponent, reply, function(data) {
						if (data) cb("ok");
						else cb("no");
					});
				} else {
					cb("late");
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
				var last_timestamp = rows[0].time, time_diff = current_timestamp - last_timestamp  - 60;

				var other_score = rows[0].first_score, score = 0;
				var str = "";

				if (time_diff <= 0) {
					updateScore(query, grid, words, solution, username, opponent, reply, function(data) {
						if (data) cb("ok");
						else cb("no");
					});
				} else {
					cb("late");
				}
			});
		}
	});
}

var finalize = function(query, username, opponent, reply, cb) {
	query("SELECT EXTRACT(EPOCH FROM NOW()) AS time", function(err, rows, result) {
		var current_timestamp = rows[0].time;
	
		if (!reply) {
			query("SELECT *, EXTRACT(EPOCH FROM user_time) AS user_time, EXTRACT(EPOCH FROM opponent_time) AS opponent_time FROM challenges WHERE username = $1 AND opponent = $2",
				[username, opponent],
				function(err, rows, results) {

				if (err) {
					return console.error('error running query', err);
				}
				if (!rows[0] || !rows[0].puzzle) {
					return console.error('error puzzle not found');
				}

				if (!rows[0].user_time || !rows[0].opponent_time) {
					cb("Your score: " + rows[0].user_score, -1);
					return;
				}

				var user_diff = current_timestamp - rows[0].user_time - 60;
				var opponent_diff = current_timestamp - rows[0].opponent_time - 60;

				if (user_diff > 0 && opponent_diff > 0) {
					var str = "Your score: " + rows[0].user_score + ". Friend's score: " + rows[0].opponent_score + ". Result: ", verdict;

					if (rows[0].user_score > rows[0].opponent_score) {
						str += "You win.";
						verdict = 0;
					} else if (rows[0].user_score < rows[0].opponent_score) {
						str += "You lose.";
						verdict = 1;
					} else {
						str += "Draw.";
						verdict = 2;
					}

					updateResult(query, username, opponent, rows[0].user_score, rows[0].opponent_score);
					updateResult(query, opponent, username, rows[0].opponent_score, rows[0].user_score);
					cb(str, verdict);
				} else {
					cb("", -1);
				}
			});
		} else {
			query("SELECT *, EXTRACT(EPOCH FROM user_time) AS user_time, EXTRACT(EPOCH FROM opponent_time) AS opponent_time FROM challenges WHERE username = $1 AND opponent = $2",
				[opponent, username],
				function(err, rows, results) {

				if (err) {
					return console.error('error running query', err);
				}
				if (!rows[0] || !rows[0].puzzle) {
					return console.error('error puzzle not found');
				}

				if (!rows[0].user_time || !rows[0].opponent_time) {
					cb("Your score: " + rows[0].opponent_score, -1);
					return;
				}

				var user_diff = current_timestamp - rows[0].user_time - 60;
				var opponent_diff = current_timestamp - rows[0].opponent_time - 60;

				if (user_diff > 0 && opponent_diff > 0) {
					var str = "Your score: " + rows[0].opponent_score + ". Friend's score: " + rows[0].user_score + ". Result: ", verdict;

					if (rows[0].opponent_score > rows[0].user_score) {
						str += "You win.";
						verdict = 0;
					} else if (rows[0].opponent_score < rows[0].user_score) {
						str += "You lose.";
						verdict = 1;
					} else {
						str += "Draw.";
						verdict = 2;
					}

					updateResult(query, username, opponent, rows[0].opponent_score, rows[0].user_score);
					updateResult(query, opponent, username, rows[0].user_score, rows[0].opponent_score);
					query("DELETE FROM challenges WHERE username = $1 AND opponent = $2", [opponent, username], function(err, rows, results) {
						if (err) {
							return console.error('error running query', err);
						}
					});
					cb(str, verdict);
				} else {
					cb("", -1);
				}
			});
		}
	});
}

var searchChallenges = function(query, username, cb) {
	query("SELECT * FROM challenges WHERE opponent = $1 and opponent_time IS NULL", [username], function(err, rows, results) {
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
		query("SELECT * FROM challenges WHERE username = $1 AND opponent_time IS NULL", [username], function(err, rows, results) {
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
	finalize: finalize,
	searchChallenges: searchChallenges,
	searchResults: searchResults
}