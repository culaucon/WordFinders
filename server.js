var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var query = require("pg-query");
var expressSession = require("express-session");
var flash = require("connect-flash");
var passport = require("passport");
var puzzle = require("./puzzle/puzzle");
var port = 3000;

var app = express();

// PostgreSQL setup
//query.connectionParameters = "postgres://cp3101b:cp3101b@localhost/wordfinders";
query.connectionParameters = process.env.DATABASE_URL;
query('SELECT NOW()', function(err, rows, result) {
	console.log(rows);
});

// Flash setup
app.use(flash());
console.log("finished flash");

// Passport setup
//app.use(expressSession({secret: "secret session"}));
app.use(passport.initialize());
app.use(passport.session());
console.log("initializing passport");
require("./passport/passport")(passport, query);
console.log("finished passport");

// Express setup
app.use(express.static(path.join(__dirname, "views")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
})); 
app.set("view engine", "ejs");
console.log("finished ejs");

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
	var new_puzzle = puzzle.generatePuzzle();
	res.send(new_puzzle);
});


app.listen(port);

console.log("Listening to port " + port);
