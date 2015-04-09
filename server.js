var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
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
	res.render("index.ejs");
});

app.get("/login", function(req, res) {
	if (req.user) res.redirect("/");
	res.render("login.ejs", {message: req.flash("loginMessage"), login: true});
});

app.post("/login", passport.authenticate("local-login", {
		failureRedirect: "/login",
		failureFlash: true
	}), function(req, res) {
		if (req.body.remember) {
			req.cookies.maxAge = 1000 * 60 * 3;
		} else {
			req.cookies.expires = false;
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
	res.render("practice.ejs", {page: "practice"});
});

app.post("/gen-puzzle", function(req, res) {
	res.send(puzzle.generatePuzzle());
});

app.post("/check-solution", function(req, res){
	puzzle.checkSolution(req.body.username, req.body.solution);
	res.send();
});

if (process.env.PORT) {
	PORT = process.env.PORT;
}

app.listen(PORT);

console.log("Listening to port " + PORT);
