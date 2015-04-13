var updateRating = function(query, username, rating, verdict) {
	query("SELECT * FROM stats WHERE username = $1", [username], function(err, rows, results) {
		if (err) {
			return console.error('error running query', err);
		}
		if (!rows || !rows[0]) {
			return console.error("username does not exist in stats");
		}
		var win = rows[0].win, lose = rows[0].lose, draw = rows[0].draw;
		if (verdict === 0) win++;
		else if (verdict === 1) lose++;
		else draw++;

		query("UPDATE stats SET (win, lose, draw, rating) = ($1, $2, $3, $4) WHERE username = $5", [win, lose, draw, rating, username], function(err, rows, results) {
			if (err) {
				return console.error('error running query', err);
			}
		});
	});
}

var updateRatings = function(query, elo, username, opponent, verdict) {
	var first_rating, second_rating;
	query("SELECT * FROM stats WHERE username = $1", [username], function(err, rows, results) {
		if (err) {
			return console.error('error running query', err);
		}
		if (!rows || !rows[0]) {
			query("INSERT INTO stats (username, rating, win, lose, draw) VALUES ($1, 1200, 0, 0, 0)", [username], function(err, rows, results) {
				if (err) {
					return console.error('error running query', err);
				}
			})
			first_rating = 1200;
		} else {
			first_rating = rows[0].rating;
		}

		query("SELECT * FROM stats WHERE username = $1", [opponent], function(err, rows, results) {
			if (err) {
				return console.error('error running query', err);
			}
			if (!rows || !rows[0]) {
				query("INSERT INTO stats (username, rating, win, lose, draw) VALUES ($1, 1200, 0, 0, 0)", [opponent], function(err, rows, results) {
					if (err) {
						return console.error('error running query', err);
					}
				})
				second_rating = 1200;
			} else {
				second_rating = rows[0].rating;
			}

			console.log(first_rating, second_rating);

			var expected_first_score = elo.getExpected(first_rating, second_rating);
			var expected_second_score = elo.getExpected(second_rating, first_rating);

			if (verdict !== 2) {
				first_rating = elo.updateRating(expected_first_score, 1 - verdict, first_rating);
				second_rating = elo.updateRating(expected_second_score, verdict, second_rating);
				updateRating(query, username, first_rating, verdict);
				updateRating(query, opponent, second_rating, 1 - verdict);
			} else {
				updateRating(query, username, first_rating, verdict);
				updateRating(query, opponent, second_rating, verdict);
			}
		});
	});
}


var getStats = function(query, username, cb) {
	query("SELECT * FROM stats WHERE username = $1", [username], function(err, rows, results) {
		if (err) {
			return console.error('error running query', err);
		}
		if (!rows || !rows[0]) {
			query("INSERT INTO stats (username, rating, win, lose, draw) VALUES ($1, 1200, 0, 0, 0)", [username], function(err, rows, results) {
				if (err) {
					return console.error('error running query', err);
				}
				var data = {
					win: 0,
					lose: 0,
					draw: 0,
					rating: 1200
				}
				cb(data);
			})
		} else {
			var data = {
				win: rows[0].win,
				lose: rows[0].lose,
				draw: rows[0].draw,
				rating: rows[0].rating
			}
			cb(data);
		}
	});
}

module.exports = {
	updateRatings: updateRatings,
	getStats: getStats
}