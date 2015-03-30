var LocalStrategy = require("passport-local").Strategy;
var bcrypt = require("bcrypt-nodejs");

module.exports = function(passport, query) {

	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});
	
	passport.deserializeUser(function(id, done) {
		query("SELECT * FROM users WHERE id = $1", [id], function(err, rows, result) {
	 		if (err) {
				return console.error('error running query', err);
		    }
			done(err, rows[0]);
		});
	});
	
	passport.use("local-login", new LocalStrategy({
			usernameField: "username",
			passwordField: "password",
			passReqToCallback: true
		}, function(req, username, password, done) {
			query("SELECT * FROM users WHERE username = $1", [username], function(err, rows, result) {
				if (err) return done(err);
				if (rows.length === 0) return done(null, false, req.flash("loginMessage", "Username is not found."));
				if (!bcrypt.compareSync(password, rows[0].password)) return done(null, false, req.flash("loginMessage", "Wrong password."));
				return done(null, result.rows[0]);
			});
		})
	);
	
	passport.use("local-signup", new LocalStrategy({
			usernameField: "username",
			passwordField: "password",
			passReqToCallback: true
		},	function(req, username, password, done) {
			query("SELECT * FROM users WHERE username = $1", [username], function(err, rows, result) {
				if (err) return done(err);
				if (rows.length > 0) return done(null, false, req.flash("signupMessage", "Username is already taken."));
				else {
					var hashed_password = bcrypt.hashSync(password, null, null);
					query("INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id", [username, hashed_password], function(err, rows, result) {
						if (err) return done(err);
						var newUser = {
							id: rows[0].id,
							username: username,
							password: hashed_password
						}
						return done(null, newUser);
					});
				}
			});
		})
	);
}
