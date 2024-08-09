import { config } from "dotenv";
config();

import { handleAPIRequest } from "./api/index.js";
import { getQuery, getURLParam, resp } from "./utils.js";
import { buckets, dataDir, envCheck } from "./utils.js";
import * as fs from "fs";
import * as path from "path";
import { IncomingMessage, ServerResponse } from "http";
import { verifyToken } from "./jwt.js";
import * as http from "http";
import { deleteFile, streamFile, moveFile, pipeFile } from "./reader.js";

//TODO: find a better way to do this + make it editable by user
const directoryTemplate = `
    <title>Little Tiny Storage</title>

<h1>{{bucket}}</h1>
<ul>
  {#file}
  <li><a href="/{{bucket}}/{{file}}">{{file}}</a></li>
  {/file}
</ul>

`;

async function canAccessFile(
  bucket: string,
  key: string | null,
  file: string,
  type: string,
  res: ServerResponse
) {
  const envPublic = envCheck(bucket, "PUBLIC");
  if (envPublic === "true" && type === "download") return true;

  //authentication is required
  if (!key) return "Key required";
  //check key
  const { authorized, timeLeft, decoded } = await verifyToken(
    key,
    bucket,
    file,
    type
  );
  if (!authorized)
    return "Token is not valid or not authorized to perform this action";

  if (res) {
    res.setHeader("Bucket", bucket);
    if (timeLeft) res.setHeader("Token-ExpiresIn", timeLeft ?? "never");
    if (decoded?.file) res.setHeader("Token-File", decoded.file ?? "any");
    if (decoded?.type) res.setHeader("Token-Type", decoded.type ?? "any");
  }

  return true;
}

export function createServer(
  requestListener: http.RequestListener,
  port: number,
  name: string
) {
  console.log(`🚀 ${name} is running on port ${port}`);
  return http.createServer(requestListener).listen(port);
}

export const requestListener = async function (
  req: IncomingMessage,
  res: ServerResponse
) {
  const origin = req.headers.origin;
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(",") ?? [];
  if (
    origin &&
    (allowedOrigins.includes(origin) || allowedOrigins.includes("*"))
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type"
    );
  }

  if (req.method === "OPTIONS") return resp(res, 200);

  const params = getQuery(req?.url ?? "");

  //custom urls
  const hostname = req.headers.host;

  if (hostname) {
    for (const bucket of buckets) {
      const envPublicURLS = envCheck(bucket, "PUBLIC_URLS")?.split(",") ?? [];
      if (envPublicURLS.includes(hostname)) {
        const file = getURLParam(req?.url ?? "", 1);
        if (!file) return resp(res, 200, bucket);
        const key = params.get("key");
        //check if file is accessible
        const canAccess = await canAccessFile(
          bucket,
          key,
          file,
          "download",
          res
        );
        if (canAccess !== true) return resp(res, 401, canAccess);

        const foundFile = streamFile(bucket, file);
        if (!foundFile) return resp(res, 404);
        return resp(res, 200, foundFile, "file");
      }
    }
  }

  if (req?.url && req.url.startsWith("/api"))
    return await handleAPIRequest(req, res, params, {
      buckets,
    });

  if (req.url === "/")
    return resp(res, 200, process.env.WELCOME_MESSAGE ?? "LittleTinyStorage");

  const bucket = getURLParam(req?.url ?? "", 1);
  if (!bucket) return resp(res, 400, "Bucket was not found in URL.");
  if (!buckets.includes(bucket)) return resp(res, 404, "Bucket not found");

  const file = getURLParam(req?.url ?? "", 2);

  if (!file) {
    if (
      envCheck(bucket, "DIR") === "true" &&
      fs.existsSync(path.join(dataDir, bucket))
    ) {
      const files = fs.readdirSync(path.join(dataDir, bucket));

      let directoryListing = directoryTemplate;

      const filesInListing: string[] = [];

      const perFileStart = directoryTemplate.split("{#file}");
      const perFile = perFileStart[1].split("{/file}")[0];

      if (!perFile) {
        console.error("Could not find file template in directory.html");
        return res.end("The directory listing has not been set up correctly.");
      }
      files.forEach((file) => {
        const fileListing = perFile.replaceAll("{{file}}", file);
        filesInListing.push(fileListing);
      });

      //replace perFile with the filesInListing
      directoryListing = directoryListing.replace(
        `{#file}${perFile}{/file}`,
        filesInListing.join("")
      );

      directoryListing = directoryListing.replaceAll("{{bucket}}", bucket);

      return resp(res, 200, directoryListing, "html");
    } else {
      return resp(res, 400, "Directory listing is disabled for this bucket");
    }
  } else {
    let type;
    if (req.method === "GET") type = "download";
    else if (req.method === "POST") type = "upload";
    else if (req.method === "DELETE") type = "delete";
    else if (req.method === "PUT") type = "rename";
    else return resp(res, 400, "Invalid method");

    if (
      (await canAccessFile(bucket, null, file, "download", res)) &&
      type === "download"
    ) {
      //if accessible without authentication
      const foundFile = streamFile(bucket, file);
      if (!foundFile) return resp(res, 404);
      return resp(res, 200, foundFile, "file");
    }

    const key = params.get("key");

    if (!key) return resp(res, 401, "Key required");

    const canAccess = await canAccessFile(bucket, key, file, type, res);
    if (canAccess !== true) return resp(res, 401, canAccess);

    if (type === "download") {
      const foundFile = streamFile(bucket, file);
      if (!foundFile) return resp(res, 404);
      return resp(res, 200, foundFile, "file");
    }
    if (type === "upload") {
     await pipeFile(bucket, file, req);
      return resp(res, 200);
    }
    if (type === "delete") {
      deleteFile(bucket, file);
      return resp(res, 200);
    }
    if (type === "rename") {
      const newName = params.get("name");
      const newBucket = params.get("bucket");

      if (!newName && !newBucket)
        return resp(
          res,
          400,
          "Please provide a new name or a new bucket, or both"
        );

      if (newBucket && process.env.MOVING_ACROSS_BUCKETS !== "true")
        return resp(res, 400, "Moving files across buckets is disabled");

      if (newBucket && !buckets.includes(newBucket))
        return resp(res, 400, "Invalid destination bucket");

      const nameToSet = newName ?? file;
      const bucketToSet = newBucket ?? bucket;

      moveFile(bucket, file, bucketToSet, nameToSet);
      return resp(res, 200);
    }
  }
};
