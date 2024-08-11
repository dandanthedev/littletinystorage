import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import * as crypto from "crypto";
import jstoxml from "jstoxml";
import { IncomingMessage, ServerResponse } from "http";
import { resp } from "./utils.js";
import mime from "mime";
import * as send from "send";
config();

let dataDir: string;

if (!process.env.DATA_DIR || process.env.DATA_DIR === "") {
  dataDir = "./data";
  console.warn("DATA_DIR is not set, using default ./data");
} else dataDir = process.env.DATA_DIR;

function removeDirectoryChanges(dir: string) {
  //TODO: test this a lot :D
  //if it contains ../ or ./ then remove it
  if (dir.includes("../")) dir = dir.replaceAll("../", "");
  if (dir.includes("./")) dir = dir.replaceAll("./", "");

  return dir;
}

export function getFile(bucket: string, file: string) {
  const safeFile = removeDirectoryChanges(file);
  const safeBucket = removeDirectoryChanges(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  const filePath = path.join(bucketPath, safeFile);

  if (!fs.existsSync(filePath)) return null;

  return fs.readFileSync(filePath);
}

export async function pipeFile(
  bucket: string,
  file: string,
  req: IncomingMessage
) {
  const safeFile = removeDirectoryChanges(file);
  const safeBucket = removeDirectoryChanges(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  const filePath = path.join(bucketPath, safeFile);

  return new Promise((resolve, reject) => {
    req.pipe(fs.createWriteStream(filePath));
    req.on("end", () => {
      resolve(true);
    });
    req.on("error", (err) => {
      reject(err);
    });
  });
}

export async function pipeFileStream(
  bucket: string,
  file: string,
  stream: fs.ReadStream
) {
  const safeFile = removeDirectoryChanges(file);
  const safeBucket = removeDirectoryChanges(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  const filePath = path.join(bucketPath, safeFile);

  return new Promise((resolve) => {
    stream.pipe(fs.createWriteStream(filePath));
    stream.on("end", () => {
      resolve(true);
    });
  });
}

export const streamFile = (
  bucket: string,
  file: string,
  req?: IncomingMessage,
  res?: ServerResponse
) => {
  const safeFile = removeDirectoryChanges(file);
  const safeBucket = removeDirectoryChanges(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  const filePath = path.join(bucketPath, safeFile);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileStats = getFileStats(bucket, file);

  if (!fileStats) {
    return null;
  }

  let start: string | number = 0;
  let end: string | number = fileStats.size - 1;

  const range = req?.headers.range;
  if (range) {
    if (!res) throw new Error("Range requested but no response provided");
    start = range.replace("bytes=", "").split("-")[0];
    end = range.replace("bytes=", "").split("-")[1];
    start = start ? parseInt(start, 10) : 0;
    end = end ? parseInt(end, 10) : fileStats.size - 1;

    if (!isNaN(start) && isNaN(end)) {
      start = start;
      end = fileStats.size - 1;
    }

    if (isNaN(start) && !isNaN(end)) {
      start = fileStats.size - end;
      end = fileStats.size - 1;
    }

    if (start >= fileStats.size || end >= fileStats.size) {
      return null;
    }

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileStats.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": `${end - start + 1}`,
      "Content-Type": fileStats.mimeType ?? "application/octet-stream",
    });
  }

  return fs.createReadStream(filePath, {
    //handle content-range
    start,
    end,

    highWaterMark: 1024 * 1024 * 10,
  });

  // const stream: fs.ReadStream = send.default(req, filePath);
  // return stream;
};

export const deleteFile = (bucket: string, file: string) => {
  const safeFile = removeDirectoryChanges(file);
  const safeBucket = removeDirectoryChanges(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  const filePath = path.join(bucketPath, safeFile);

  if (!fs.existsSync(filePath)) return null;

  fs.unlinkSync(filePath);

  return true;
};

export function getFiles(bucket: string) {
  const safeBucket = removeDirectoryChanges(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  if (!fs.existsSync(bucketPath)) return null;

  return fs.readdirSync(bucketPath);
}

export function getFileStats(bucket: string, file: string) {
  const safeFile = removeDirectoryChanges(file);
  const safeBucket = removeDirectoryChanges(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  const filePath = path.join(bucketPath, safeFile);

  if (!fs.existsSync(filePath)) return null;

  const stats = fs.statSync(filePath);

  return {
    file,
    mimeType: mime.getType(filePath),
    size: stats.size,
    lastModified: stats.mtime.toISOString(),
  };
}

export function getFilesAndStats(bucket: string) {
  const safeBucket = removeDirectoryChanges(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  if (!fs.existsSync(bucketPath)) return null;

  const files = fs.readdirSync(bucketPath);
  const stats = files.map((file) => {
    const stats = getFileStats(bucket, file);
    return stats;
  });

  return stats;
}

export function getETag(bucket: string, file: string) {
  const safeFile = removeDirectoryChanges(file);
  const safeBucket = removeDirectoryChanges(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  const filePath = path.join(bucketPath, safeFile);

  if (!fs.existsSync(filePath)) return null;

  const stats = fs.statSync(filePath);
  return crypto.createHash("md5").update(stats.size.toString()).digest("hex");
}

export function getFilesAWS(bucket: string) {
  const safeBucket = removeDirectoryChanges(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  if (!fs.existsSync(bucketPath)) return null;

  const files = fs.readdirSync(bucketPath);
  const filesAWS = files.map((file) => {
    const filePath = path.join(bucketPath, file);
    const stats = fs.statSync(filePath);
    const etag = getETag(bucket, file);
    return jstoxml.toXML({
      Contents: {
        ETag: etag,
        Key: file,
        LastModified: stats.mtime.toISOString(),
        Owner: {
          DisplayName: "LittleTinyStorage",
          ID: "123456789012",
        },
        RestoreStatus: {
          IsRestoreInProgress: false,
          RestoreExpiryDate: new Date(0).toISOString(),
        },
        Size: stats.size,
        StorageClass: "STANDARD",
      },
    });
  });

  return filesAWS;
}

export const moveFile = (
  bucketFrom: string,
  fileFrom: string,
  bucketTo: string,
  fileTo: string
) => {
  if (!bucketTo) bucketTo = bucketFrom;
  if (!fileTo) fileTo = fileFrom;

  const safeFileFrom = path.normalize(fileFrom);
  const safeBucketFrom = path.normalize(bucketFrom);
  const bucketPathFrom = path.join(dataDir, safeBucketFrom);
  const filePathFrom = path.join(bucketPathFrom, safeFileFrom);

  const safeFileTo = path.normalize(fileTo);
  const safeBucketTo = path.normalize(bucketTo);
  const bucketPathTo = path.join(dataDir, safeBucketTo);
  const filePathTo = path.join(bucketPathTo, safeFileTo);

  if (!fs.existsSync(filePathFrom)) return null;

  fs.renameSync(filePathFrom, filePathTo);
};
