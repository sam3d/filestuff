"use strict";

const express = require("express");
const app = express();
const path = require("path");
const bytes = require("bytes");
const numeral = require("numeral");
const low = require("lowdb");
const Stream = require("stream");
const progress = require("progress-stream");

// Database setup
let db = low(__dirname + "/db/low.json");
db.defaults({
    stats: {
        downloads: 0,
        transfer: 0,
        speed: {
            total: 500000,
            count: 1
        }
    }
}).value();

// Configuration
let port = process.env.PORT || 8080;
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

// Middleware
app.use(express.static(__dirname + "/public"));

// Primary routes
app.get("/", (req, res) => {

    // Get database values
    let downloads = numeral(db.get("stats.downloads").value()).format("0,0");
    let speedTotal = db.get("stats.speed.total").value();
    let speedCount = db.get("stats.speed.count").value();
    let speedAverage = bytes(speedTotal / speedCount) + "/s";
    let transfer = bytes(db.get("stats.transfer").value());

    res.render("index", {
        stats: {
            downloads: downloads,
            speed: speedAverage,
            transfer: transfer
        }
    });
});

// Primary API route
app.get("/:filesize/:filename", (req, res) => {

    // Get request parameters
    let fileSize = req.params.filesize;
    let fileName = req.params.filename;

    // Attempt to parse the size
    let contentSize = bytes.parse(fileSize);

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
            "Content-Disposition": "attachment; filename=" + fileName,
            "Content-Length": contentSize
        });

        // Define readable stream class
        class DataStream extends Stream.Readable {

            // Construct the class
            constructor(opt) {
                super(opt);
                this._remaining = contentSize;
            }

            // When the class is read
            _read(size) {
                if (this._remaining === 0) {
                    this.push(null);
                } else {
                    if (this._remaining < size) {

                        // Push the remaining, set to 0 and finish read
                        this.push(Buffer.alloc(this._remaining));
                        this._remaining = 0;

                    } else {

                        // Push the size being requested
                        this.push(Buffer.alloc(size));
                        this._remaining = this._remaining - size;

                    }
                }
            }
        }

        // Create new stream
        let rs = new DataStream();

        // Create stream monitor
        let monitor = progress({
            length: contentSize,
            time: 1000,
            speed: 0
        });

        // When progress is detected
        monitor.on('progress', progress => {

            // Update statistics
            db.set("stats.transfer", db.get("stats.transfer").value() + progress.delta).value();
            db.set("stats.speed.count", db.get("stats.speed.count").value() + 1).value();
            db.set("stats.speed.total", db.get("stats.speed.total").value() + progress.speed).value();

        });

        // Pipe output to response
        rs.pipe(monitor).pipe(res);

        // Additional debugging commands
        // res.on("close", () => { console.log("Response closed"); });
        // res.on("end", () => { console.log("Response ended"); });
        // req.on("close", () => { console.log("Request closed"); });
        // req.on("end", () => { console.log("Request ended"); });
        // rs.on("end", () => { console.log("Stream ended"); });
        // rs.on("close", () => { console.log("Stream closed"); });

    }

});

app.get("*", (req, res) => {
    res.redirect("/");
});

// Listen
app.listen(port);
console.log("Listening on port " + port);
