// Dependencies
var express = require("express");
var app = express();

// Configuration
var port = process.env.PORT || 8080;

// Primary routes
app.get("/", function(req, res){
    res.send("Welcome!");
});

// Listen
app.listen(port);
console.log("Listening on port " + port);
