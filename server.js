// Dependencies
var express = require("express");
var app = express();
var bytes = require("bytes");

// Configuration
var port = process.env.PORT || 8080;
var packetsize = 200;
app.set("view engine", "ejs");
app.set("views", __dirname + "/public/views");

// Middleware
app.use(express.static(__dirname + "/public"));

// Primary routes
app.get("/", function(req, res){
    res.render("index");
});

// Primary API route
app.get("/:filesize/:filename", function(req, res){

    // Get request parameters
    var filesize = req.params.filesize;
    var filename = req.params.filename;

    // Attempt to parse the size
    var buffersize = bytes.parse(filesize);

    // Make sure valid filesize
    if (isNaN(buffersize) || buffersize === null) {

        res.json({
            success: false,
            message: "Could not parse the filesize '" + filesize + "' into bytes"
        });

    } else {

        // Set the response headers
        res.set("Content-Type", "application/octet-stream");
        res.set("Content-Length", buffersize);

        // Send the file

    }

});

app.get("*", function(req, res){
    res.redirect("/");
});

// Listen
app.listen(port);
console.log("Listening on port " + port);
