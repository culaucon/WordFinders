var express = require("express");
var bodyParser = require("body-parser");
var puzzle = require("./puzzle");

var app = express();

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
