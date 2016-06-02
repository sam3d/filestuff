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
        transfer: 0,
        speed: {
            cumulative: 0,
            count: 0
        }
    }
}).value();

// Configuration
var port = process.env.PORT || 8080;
app.set("view engine", "ejs");
app.set("views", __dirname + "/public/views");

// Middleware
app.use(express.static(__dirname + "/public"));

// Primary routes
app.get("/", function(req, res){

    // Get database values
    var downloads = numeral(db.get("stats.downloads").value()).format("0,0");
    var speedTotal = db.get("stats.speed.total").value();
    var speedCount = db.get("stats.speed.count").value();
    var speedAverage = bytes(speedTotal / speedCount) + "/s";
    var transfer = bytes(db.get("stats.transfer").value());

    res.render("index", {
        stats: {
            downloads: downloads,
            speed: speedAverage,
            transfer: transfer
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

        // When progress is detected
        monitor.on('progress', progress => {

            console.log("Transferred: " + bytes(progress.transferred));

            // Update statistics
            db.set("stats.transfer", db.get("stats.transfer").value() + progress.delta).value();
            db.set("stats.speed.count", db.get("stats.speed.count").value() + 1).value();
            db.set("stats.speed.total", db.get("stats.speed.total").value() + progress.speed).value();

        });

        // When the stream is read
        rs._read = (size) => {
            if (rs.remaining < size) {

                // Push the remaining, set to 0 and finish read
                rs.push(Buffer.alloc(rs.remaining));
                rs.remaining = 0;
                rs.push(null);

            } else {

                // Push the size being requested
                rs.push(Buffer.alloc(size));
                rs.remaining = rs.remaining - size;

            }

        };

        // Pipe output to response
        rs.pipe(monitor).pipe(res);

        // Additional debugging commands
        res.on("close", err => {
            console.log("Response closed");
        });

        res.on("end", err => {
            console.log("Response ended");
        });

        req.on("close", err => {
            console.log("Request closed");
        });

        req.on("end", err => {
            console.log("Request ended");
        });
    }

});

app.get("*", function(req, res){
    res.redirect("/");
});

// Listen
app.listen(port);
console.log("Listening on port " + port);
