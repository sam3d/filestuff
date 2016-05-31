// Dependencies
var express = require("express");
var app = express();

// Configuration
var port = process.env.PORT || 8080;
app.set("view engine", "ejs");
app.set("views", __dirname + "/public/views");

// Middleware
app.use(express.static(__dirname + "/public"));

// Primary routes
app.get("/", function(req, res){
    res.render("index");
});

// Listen
app.listen(port);
console.log("Listening on port " + port);
