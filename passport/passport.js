var LocalStrategy = require("passport-local").Strategy;
var bcrypt = require("bcrypt-nodejs");

module.exports = function(passport, connection) {

	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});
	
	passport.deserializeUser(function(id, done) {
		connection.query("SELECT * FROM users WHERE id = ?", [id], function(err, rows) {
			done(err, rows[0]);
		});
	});
	
	passport.use("local-signup", new LocalStrategy({
			usernameField: "username",
			passwordField: "password",
			passReqToCallback: true
		},	function(req, username, password, done) {
			connection.query("SELECT * FROM users WHERE username = ?", [username], function(err, rows) {
				if (err) return done(err);
				if (rows.length > 0) return done(null, false, req.flash("signupMessage", "Username is already taken."));
				else {
					var hashed_password = bcrypt.hashSync(password, null, null);
					connection.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashed_password], function(err, rows) {
						if (err) return done(err);
						return done(null, rows[0]);
					});
				}
			});
		})
	);
	
	passport.use("local-login", new LocalStrategy({
			usernameField: "username",
			passwordField: "password",
			passReqToCallback: true
		}, function(req, username, password, done) {
			connection.query("SELECT * FROM users WHERE username = ?" [username], function(err, rows) {
				if (err) return done(err);
				if (rows.length === 0) return done(null, false, req.flash("signinMessage", "Username is not found."));
				if (!bcrypt.compareSync(password, rows[0].password)) return done(null, false, req.flash("signinMessage", "Wrong password."));
				return done(null, rows[0]);
			});
		})
	);
}
