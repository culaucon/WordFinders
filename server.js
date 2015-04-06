var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var query = require("pg-query");
var expressSession = require("express-session");
var flash = require("connect-flash");
var passport = require("passport");
var puzzle = require("./puzzle/puzzle");
var PORT = 3000;

var app = express();

// PostgreSQL setup
query.connectionParameters = "postgres://cp3101b:cp3101b@localhost/wordfinders";
//query.connectionParameters = process.env.DATABASE_URL;

// Flash setup
app.use(flash());

// Passport setup
app.use(expressSession({secret: "secret session"}));
app.use(passport.initialize());
app.use(passport.session());
require("./passport/passport")(passport, query);

// Express setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
})); 
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// Routes setup
app.get("/", function(req, res) {
	var username;
	if (req.user) {
		username = req.user.username;
	}
	res.render("index.ejs", {user: username});
});

app.get("/login", function(req, res) {
	res.render("login.ejs", {message: req.flash("loginMessage")});
});

app.post("/login", passport.authenticate("local-login", {
		successRedirect: "/",
		failureRedirect: "/login",
		failureFlash: true
	}), function(req, res) {
		if (req.body.remember) {
			req.session.cookie.maxAge = 1000 * 60 * 3;
		} else {
			req.session.cookie.expires = false;
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

app.get("/solo", function(req, res) {
	res.render("solo.ejs");
});

app.post("/gen-puzzle", function(req, res) {
	res.send(puzzle.generatePuzzle());
});

if (process.env.PORT) {
	PORT = process.env.PORT;
}

app.listen(PORT);

console.log("Listening to port " + PORT);
