var fs = require("fs");

module.exports.generatePuzzle = function() {
	const NUM_WORDS = 15;
	const N = 12;
	const SIZE = 480;
	const FILE_PATH = "./words.txt";
	const dx = [-1, -1, -1, 0, 1, 1, 1, 0];
	const dy = [-1, 0, 1, 1, 1, 0, -1, -1];

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

module.exports.checkSolution = function(username, solution) {

}
