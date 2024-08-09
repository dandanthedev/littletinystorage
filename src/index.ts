import { config } from "dotenv";
config();

import { IncomingMessage } from "http";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { buckets, dataDir } from "./utils.js";
import { createServer, requestListener } from "./http.js";
import { requestListener as uiRequestListener } from "./ui.js";
import { requestListener as s3RequestListener } from "./s3.js";
import anzip from "anzip";

//Initial setup
if (!process.env.HEYA) {
  if (!fs.existsSync("./.env.example")) {
    console.log("Downloading .env.example...");
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

//WebUI
if (process.env.ENABLE_WEBUI === "true") {
  const webExists = fs.existsSync("./web");
  if (!webExists) {
    console.log("Downloading web interface...");
    //delete old zip
    if (fs.existsSync("./webui.zip")) fs.unlinkSync("./webui.zip");
    fetch(
      "https://github.com/dandanthedev/littletinystorage-webui/releases/latest/download/build.zip"
    )
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        fs.writeFileSync("./webui.zip", Buffer.from(buffer));
        console.log("Web interface downloaded, extracting...");
        anzip("webui.zip").then(() => {
          console.log(
            "Web interface extracted, deleting zip file and renaming build folder..."
          );
          fs.unlinkSync("./webui.zip");
          setTimeout(() => {
            //todo: find better solution
            fs.renameSync("./build", "./web");
          }, 100);
        });
      });
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

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(",") ?? [];
if (allowedOrigins.length == 0) {
  console.error("Please set up some CORS allowed origins in the .env file");
  process.exit(1);
}
if (allowedOrigins.includes("*")) {
  console.warn(
    "Allowing all origins is not recommended, please set up some CORS allowed origins in the .env file"
  );
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
const uiPort = parseInt(process.env.UI_PORT ?? "7998");
const s3Port = parseInt(process.env.S3_PORT ?? "7997");

createServer(requestListener, port, "LTS");
if (process.env.ENABLE_WEBUI === "true")
  createServer(uiRequestListener, uiPort, "WebUI");
createServer(s3RequestListener, s3Port, "S3 API");
