module.exports.search = function(user, query, cb) {
	query("SELECT * FROM users WHERE username = $1", [user], function(err, rows, result) {
		if (err) {
			return console.error('error running query', err);
		}
		if (rows[0] && rows[0].username) cb(rows[0].username);
		else cb("");
	});
}

module.exports.searchLike = function(user, query, cb) {
	query("SELECT * FROM users WHERE username like $1", ["%" + user + "%"], function(err, rows, result) {
		if (err) {
			return console.error('error running query', err);
		}
		if (rows) {
			var list = [];
			for (var i = 0; i < rows.length; i++) {
				if (rows[i] && rows[i].username) list.push(rows[i].username);
			}
			cb(list);
		} else cb("");
	});
}