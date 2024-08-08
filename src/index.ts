import { config } from "dotenv";
config();

import { IncomingMessage } from "http";
import * as fs from "fs";
import * as path from "path";
import { buckets, dataDir } from "./utils.js";
import { createServer, requestListener } from "./http.js";

//Initial setup
if (!process.env.HEYA) {
  if (!fs.existsSync("./.env.example")) {
    console.log("Downloading .env.example...");
    const https = require("https");
    https.get(
      "https://raw.githubusercontent.com/dandanthedev/littletinystorage/main/.env.example",
      function (response: IncomingMessage) {
        const file = fs.createWriteStream("./.env.example");
        response.pipe(file);
        file.on("finish", function () {
          console.log(
            ".env.example downloaded, please fill in the required variables and rename it to .env"
          );
        });
      }
    );
  } else {
    console.error(
      "Please rename .env.example to .env and fill in the required variables"
    );
    process.exit(1);
  }
}

//Create data directory
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

if (buckets.length == 0) {
  console.error("Please set up some buckets in the .env file");
  process.exit(1);
}
//Create + delete buckets
buckets.forEach((bucket) => {
  const bucketPath = path.join(dataDir, bucket);
  if (!fs.existsSync(bucketPath)) {
    fs.mkdirSync(bucketPath);
    //create __internal__ directory
    if (!fs.existsSync(path.join(bucketPath, "__internal__"))) {
      fs.mkdirSync(path.join(bucketPath, "__internal__"));
    }
  }
});
if (process.env.DELETE_BUCKETS_WHEN_ENV_REMOVED === "true") {
  const bucketDirs = fs.readdirSync(dataDir);
  bucketDirs.forEach((bucket) => {
    if (buckets.indexOf(bucket) === -1) {
      const bucketPath = path.join(dataDir, bucket);
      fs.rmdirSync(bucketPath, { recursive: true });
    }
  });
}

const port = parseInt(process.env.PORT ?? "7999");

createServer(requestListener, port);
