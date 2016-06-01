// Dependencies
var express = require("express");
var app = express();
var bytes = require("bytes");
var numeral = require("numeral");
var low = require("lowdb");
var Stream = require("stream");
var progress = require("progress-stream");

// Database setup
var db = low("db.json");
db.defaults({
    stats: {
        downloads: 0,
        speed: 0,
        transfer: 0
    }
}).value();

// Configuration
var packetSize = bytes.parse("500KB"); // require("buffer").kMaxLength;
var port = process.env.PORT || 8080;
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
    var fileSize = req.params.filesize;
    var fileName = req.params.filename;

    // Attempt to parse the size
    var contentSize = bytes.parse(fileSize);

    // Make sure valid filesize
    if (isNaN(contentSize) || contentSize === null) {

        res.json({
            success: false,
            message: "Could not parse the filesize '" + fileSize + "' into bytes"
        });

    } else {

        // Increment the download counter
        db.set("stats.downloads", db.get("stats.downloads").value() + 1).value();

        // Set the response headers
        res.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-Length": contentSize
        });

        // Create stream
        var rs = Stream.Readable();

        // Set remaining
        rs.remaining = contentSize;

        // Create stream monitor
        var monitor = progress({
            length: contentSize,
            time: 1000
        });

        // When progress is detected, write the delta to database
        monitor.on('progress', progress => {
            db.set("stats.transfer", db.get("stats.transfer").value() + progress.delta).value();
        });

        // When the stream is read
        rs._read = () => {
            if (rs.remaining < packetSize) {

                // Push the remaining, set to 0 and finish read
                rs.push(Buffer.alloc(rs.remaining));
                rs.remaining = 0;
                rs.push(null);

            } else {
                rs.push(Buffer.alloc(packetSize));
                rs.remaining = rs.remaining - packetSize;
            }

        };

        // Pipe output to response
        rs.pipe(monitor).pipe(res);
    }

});

app.get("*", function(req, res){
    res.redirect("/");
});

// Listen
app.listen(port);
console.log("Listening on port " + port);
