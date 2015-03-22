var express = require("express");

var app = express();

app.use(express.static(__dirname + "/views"));
app.get("/", function(req, res) {
	res.sendfile(__dirname + "/views/index.html");
})

app.listen(3000);
