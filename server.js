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
    var contentsize = bytes.parse(filesize);

    // Make sure valid filesize
    if (isNaN(contentsize) || contentsize === null) {

        res.json({
            success: false,
            message: "Could not parse the filesize '" + filesize + "' into bytes"
        });

    } else {

        // Set the response headers
        res.set("Content-Type", "application/octet-stream");
        res.set("Content-Length", contentsize);

        // The remaining data to send
        var remaining = contentsize;

        // Loop over the packets
        for (var i = 0; i < Math.ceil(contentsize / packetsize); i++) {

            if (remaining < packetsize) {

                // There are less packets remaining than the packet size, send just those
                res.write(Buffer.alloc(remaining));

            } else {

                // Decrement remaining by packet size and send full packet
                res.write(Buffer.alloc(packetsize));
                remaining = remaining - packetsize;

            }

        }

        // Terminate the connection
        res.end();

    }

});

app.get("*", function(req, res){
    res.redirect("/");
});

// Listen
app.listen(port);
console.log("Listening on port " + port);
