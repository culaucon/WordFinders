var express = require("express");
var bodyParser = require("body-parser");
var mysql = require("mysql");
var expressSession = require("express-session");
var passport = require("passport");
var puzzle = require("./puzzle/puzzle");

var app = express();

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
});

// Passport setup
app.use(expressSession({secret: "secret session"}));
app.use(passport.initialize());
app.use(passport.session());
require("./passport/passport")(passport, connection);

// Express setup
app.use(express.static(__dirname + "/views"));
app.use(bodyParser.json());

app.get("/", function(req, res) {
	res.sendfile(__dirname + "/views/index.html");
});

app.get("/solo", function(req, res) {
	res.sendfile(__dirname + "/views/solo.html");
});

app.post("/gen-puzzle", function(req, res) {
	var new_puzzle = puzzle.generatePuzzle();
	res.send(new_puzzle);
});

app.listen(3000);
