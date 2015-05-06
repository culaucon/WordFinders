var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var query = require("pg-query");
var expressSession = require("express-session");
var flash = require("connect-flash");
var passport = require("passport");
var elo = require("elo-rank")(32);
var puzzle = require("./puzzle/puzzle");
var userSearch = require("./usersearch/usersearch");
var rating = require("./rating/rating");

var PORT = 3000;

var app = express();

// PostgreSQL setup
if (process.env.DATABASE_URL) {
	query.connectionParameters = process.env.DATABASE_URL;
} else {
	query.connectionParameters = "postgres://cp3101b:cp3101b@localhost/wordfinders";
}

// Passport setup
app.use(expressSession({secret: "secret session"}));
app.use(passport.initialize());
app.use(passport.session());
require("./passport/passport")(passport, rating, query);

// Express setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(cookieParser());
app.use(flash());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// Dynamic helpers
require("express-dynamic-helpers-patch")(app);
app.dynamicHelpers({
	user: function(req, res) {
		return req.user;
	}
});

// Routes setup
app.get("/", function(req, res) {
	if (!req.user) {
		res.render("index.ejs", {page: "home"});
	} else {
		puzzle.searchResults(query, req.user.username, function(recent) {
			rating.getUserStats(query, req.user.username, function(stats) {
				rating.getTopRatings(query, function(top) {
					res.render("index.ejs", {page: "home", recent: recent, stats: stats, top: top});
				})
			})
		});
	}
});

app.get("/user/:name?", function(req, res) {
	var name = req.param("name");

	userSearch.search(name, query, function(data) {
		if (!data) {
			res.redirect("/");
		} else {
			rating.getUserStats(query, name, function(stats) {
				puzzle.searchResults(query, name, function(recent) {
					rating.getTopRatings(query, function(top) {
						res.render("user.ejs", {page: "home", recent: recent, stats: stats, top: top});
					});
				});
			});
		}
	});
});

app.get("/login", function(req, res) {
	if (req.user) res.redirect("/");
	res.render("login.ejs", {message: req.flash("loginMessage"), login: true});
});

app.post("/login", passport.authenticate("local-login", {
		failureRedirect: "/login",
		failureFlash: true
	}), function(req, res) {
		res.cookie("username", req.user.username);
		if (req.body.remember) {
			res.cookie("maxAge", 1000 * 60 * 3);
		} else {
			res.cookie("expires", "false");
		}
		res.redirect("/");
	}
);

app.get("/signup", function(req, res) {
	res.render("signup.ejs", {message: req.flash("signupMessage")});
});

app.post("/signup", passport.authenticate("local-signup", {
		successRedirect: "/",
		failureRedirect: "/signup",
		failureFlash: true
	})
);

app.get("/logout", function(req, res) {
	req.logout();
	res.redirect("/");
})

app.get("/practice", function(req, res) {
	var mode = req.param("mode");
	if (!mode) mode = 0;
	res.render("practice.ejs", {page: "practice", mode: mode});
});

app.get("/challenge", function(req, res) {
	if (!req.user) {
		res.redirect("/login");
	} else {
		if (!req.param("opponent")) {
			puzzle.searchChallenges(query, req.user.username, function(challenges_list, unanswered_list) {
				res.render("challenge.ejs", {page: "challenge", challenges_list: challenges_list, unanswered_list: unanswered_list});
			});
		} else {
			var mode = req.param("mode");
			if (!mode) mode = 0;
			res.render("challenge_puzzle.ejs", {page: "challenge", opponent: req.param("opponent"), reply: req.param("reply"), mode: mode});
		}
	}
});

app.post("/gen-puzzle-practice", function(req, res) {
	if (!req.body.mode) req.body.mode = 0;
	res.send(puzzle.generatePuzzle(req.body.mode));
});

app.post("/gen-puzzle-challenge", function(req, res) {
	var mode = req.body.mode;
	if (!mode) mode = 0;
	var opponent = req.body.opponent;
	userSearch.search(opponent, query, function(username) {
		if (username === "") {
			res.send({
				page: "challenge",
				opponent: opponent,
				message: opponent + " is not a valid user to challenge. Please find another user.",
				redirect: "/challenge"
			});
		} else {
			puzzle.generatePuzzleChallenge(query, req.user.username, username, req.body.reply, mode, function(status, puzzle) {
				var data = {
					opponent: opponent,
					page: "challenge"
				}
				if (status === "old") {
					data.time_left = puzzle.time_left;
					data.puzzle = puzzle.puzzle;
					data.sol = puzzle.sol;
				} else {
					data.puzzle = puzzle;
				}
				res.send(data);
			});
		}
	});
});

app.post("/finalize", function(req, res) {
	puzzle.finalize(query, req.body.username, req.body.opponent, req.body.reply, req.body.mode, function(data, verdict) {
		if (verdict != -1) rating.updateRatings(query, elo, req.body.username, req.body.opponent, req.body.reply, verdict);
		res.send(data);
	});
});

app.post("/submit-solution", function(req, res) {
	puzzle.submitSolution(query, req.body.username, req.body.opponent, JSON.parse(req.body.solution), req.body.time_left, req.body.reply, function(data) {
		res.send(data);
	});
});

app.post("/user-search", function(req, res) {
	if (req.body.like) {
		userSearch.searchLike(req.body.user, query, function(list) {
			res.send(list);
		});
	} else {
		userSearch.search(req.body.user, query, function(username) {
			res.send(username);
		});
	}
});

if (process.env.PORT) {
	PORT = process.env.PORT;
}

app.listen(PORT);

console.log("Listening to port " + PORT);
