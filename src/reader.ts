import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import * as crypto from "crypto";
import jstoxml from "jstoxml";
import { IncomingMessage } from "http";

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

  return new Promise((resolve) => {
    req.pipe(fs.createWriteStream(filePath));
    req.on("end", () => {
      resolve(true);
    });
  });
}

export const streamFile = (bucket: string, file: string) => {
  const safeFile = removeDirectoryChanges(file);
  const safeBucket = removeDirectoryChanges(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  const filePath = path.join(bucketPath, safeFile);

  if (!fs.existsSync(filePath)) return null;

  return fs.createReadStream(filePath);
};

export const deleteFile = (bucket: string, file: string) => {
  const safeFile = removeDirectoryChanges(file);
  const safeBucket = removeDirectoryChanges(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  const filePath = path.join(bucketPath, safeFile);

  if (!fs.existsSync(filePath)) return null;

  fs.unlinkSync(filePath);
};

export const uploadFile = (bucket: string, file: string, data: Buffer) => {
  const safeFile = removeDirectoryChanges(file);
  const safeBucket = removeDirectoryChanges(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  const filePath = path.join(bucketPath, safeFile);

  if (!fs.existsSync(bucketPath)) fs.mkdirSync(bucketPath);

  fs.writeFileSync(filePath, data);
};

export function getFiles(bucket: string) {
  const safeBucket = removeDirectoryChanges(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  if (!fs.existsSync(bucketPath)) return null;

  return fs.readdirSync(bucketPath);
}

export function getFilesAWS(bucket: string) {
  const safeBucket = removeDirectoryChanges(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  if (!fs.existsSync(bucketPath)) return null;

  const files = fs.readdirSync(bucketPath);
  const filesAWS = files.map((file) => {
    const filePath = path.join(bucketPath, file);
    const stats = fs.statSync(filePath);
    const etag = crypto
      .createHash("md5")
      .update(stats.size.toString())
      .digest("hex");
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
