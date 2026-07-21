const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
};

http
  .createServer((req, res) => {
    let filePath = path.join(root, decodeURIComponent(req.url.split("?")[0]));
    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isDirectory()) filePath = path.join(filePath, "index.html");
      fs.readFile(filePath, (err2, data) => {
        if (err2) {
          res.writeHead(404);
          res.end("Not found: " + req.url);
          return;
        }
        res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
        res.end(data);
      });
    });
  })
  .listen(8080, "127.0.0.1", () => console.log("Serving on http://127.0.0.1:8080"));
