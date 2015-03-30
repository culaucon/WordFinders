var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var mysql = require("mysql");
var expressSession = require("express-session");
var flash = require("connect-flash");
var passport = require("passport");
var puzzle = require("./puzzle/puzzle");
var port = 3000;

var app = express();

<<<<<<< HEAD
<<<<<<< HEAD
// PostgreSQL setup
//query.connectionParameters = "postgres://cp3101b:cp3101b@localhost/wordfinders";
query.connectionParameters = "postgres://yppresjlwkjekb:eUB0b8AojEclhj_Vhdh892zUa5@ec2-23-21-73-32.compute-1.amazonaws.com:5432/d5pertm7jkbfco";
query('SELECT NOW()', function(err, rows, result) {
	console.log(rows);
=======
=======
>>>>>>> parent of 6c3cbcc... change from mysql to postgresql
// MySQL setup
var connection = mysql.createConnection({
	host: "localhost",
	user: "cp3101b",
	password: "cp3101b",
	database: "wordfinders"
});

connection.connect(function(err) {
	if (err) {
		console.log("Error connecting with MySQL: " + err.stack);
		return;
	}
	console.log("Connected to MySQL");
<<<<<<< HEAD
>>>>>>> parent of 4148f28... change from mysql to postgresql
=======
>>>>>>> parent of 6c3cbcc... change from mysql to postgresql
});

// Flash setup
app.use(flash());

// Passport setup
app.use(expressSession({secret: "secret session"}));
app.use(passport.initialize());
app.use(passport.session());
require("./passport/passport")(passport, connection);

// Express setup
app.use(express.static(path.join(__dirname, "views")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
})); 
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
	var new_puzzle = puzzle.generatePuzzle();
	res.send(new_puzzle);
});

app.get("/", function(req, res) {
	res.render("solo.ejs");
});

app.listen(port);

console.log("Listening to port " + port);

