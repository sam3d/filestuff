// Dependencies
var express = require("express");
var app = express();
var bytes = require("bytes");
var numeral = require("numeral");
var low = require("lowdb");

// Database setup
var db = low(process.env.STORAGE || "db.json");
db.defaults({
    stats: {
        downloads: 0,
        speed: 0,
        transfer: 0
    }
}).value();

// Configuration
var port = process.env.PORT || 8080;
var packetsize = 4000;
app.set("view engine", "ejs");
app.set("views", __dirname + "/public/views");

// Middleware
app.use(express.static(__dirname + "/public"));

// Primary routes
app.get("/", function(req, res){
    res.render("index", {
        stats: {
            downloads: numeral(db.get("stats.downloads").value()).format("0,0"),
            speed: bytes(db.get("stats.speed").value()) + "/s",
            transfer: bytes(db.get("stats.transfer").value())
        }
    });
});

// Primary API route
app.get("/:filesize/:filename", function(req, res){

    // Get request parameters
    var filesize = req.params.filesize;
    var filename = req.params.filename;

    // Handle end of connection
    var connectionEnded = false;
    req.on("end", err => {
        connectionEnded = true;
    });

    // Attempt to parse the size
    var contentsize = bytes.parse(filesize);

    // Make sure valid filesize
    if (isNaN(contentsize) || contentsize === null) {

        res.json({
            success: false,
            message: "Could not parse the filesize '" + filesize + "' into bytes"
        });

    } else {

        // Increment the download counter
        db.set("stats.downloads", db.get("stats.downloads").value() + 1).value();

        // Set the response headers
        res.set("Content-Type", "application/octet-stream");
        res.set("Content-Length", contentsize);

        // The remaining data to send
        var remaining = contentsize;

        // Loop over the packets
        for (var i = 0; i < Math.ceil(contentsize / packetsize); i++) {

            if (connectionEnded)
                break;

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
