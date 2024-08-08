import { handleAPIRequest } from "./api/index.js";
import { resp } from "./utils.js";
import { buckets, dataDir } from "./utils.js";
import * as fs from "fs";
import * as path from "path";
import { IncomingMessage, ServerResponse } from "http";
import { verifyToken } from "./jwt.js";
import * as http from "http";

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

export function createServer(
  requestListener: http.RequestListener,
  port: number
) {
  console.log(`🚀 LTS is running on port ${port}`);
  return http.createServer(requestListener).listen(port);
}

export const requestListener = async function (
  req: IncomingMessage,
  res: ServerResponse
) {
  const query = req.url ? req.url.split("?")[1] : "";
  const params = new URLSearchParams(query);

  if (req?.url && req.url.startsWith("/api"))
    return await handleAPIRequest(req, res, params, {
      buckets,
    });

  if (req.url === "/")
    return resp(res, 200, process.env.WELCOME_MESSAGE ?? "LittleTinyStorage");
  const bucket = req.url ? req.url.split("/")[1].split("/")[0] : "";
  if (!buckets.includes(bucket)) return resp(res, 404, "Bucket not found");
  const file = req.url ? req.url.split("/")[2].split("?")[0] : null;

  console.log(params);
  console.log(file);
  if (!file) {
    if (
      process.env[bucket + "_DIR"] === "true" &&
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

    const filePath = path.join(dataDir, bucket, file);

    if (process.env[bucket + "_PUBLIC"] === "true" && type === "download") {
      if (!fs.existsSync(filePath)) return resp(res, 404);
      return resp(res, 200, fs.readFileSync(filePath), "file");
    }

    const key = params.get("key");

    if (!key) return resp(res, 401, "Key required");

    const { authorized, timeLeft, decoded } = await verifyToken(
      key,
      bucket,
      file,
      type
    );
    if (!authorized)
      return resp(
        res,
        401,
        "Token is not valid or not authorized to perform this action"
      );

    if (bucket) res.setHeader("Bucket", bucket);

    if (timeLeft) res.setHeader("Token-ExpiresIn", timeLeft ?? "never");
    if (decoded?.file) res.setHeader("Token-File", decoded.file ?? "any");
    if (decoded?.type) res.setHeader("Token-Type", decoded.type ?? "any");

    if (type === "download") {
      if (!fs.existsSync(filePath)) return resp(res, 404);
      return resp(res, 200, fs.readFileSync(filePath), "file");
    }
    if (type === "upload") {
      const data: Buffer = await new Promise((resolve) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk) => {
          chunks.push(chunk);
        });
        req.on("end", () => {
          resolve(Buffer.concat(chunks));
        });
      });
      fs.writeFileSync(filePath, data);
      return resp(res, 200);
    }
    if (type === "delete") {
      if (!fs.existsSync(filePath)) return resp(res, 404, "File not found");
      fs.unlinkSync(filePath);
      return resp(res, 200);
    }
    if (type === "rename") {
      if (!fs.existsSync(filePath)) return resp(res, 404, "File not found");
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

      const nameToSet = newName ?? file;
      const bucketToSet = newBucket ?? bucket;

      fs.renameSync(filePath, path.join(dataDir, bucketToSet, nameToSet));
      return resp(res, 200);
    }
  }
};
