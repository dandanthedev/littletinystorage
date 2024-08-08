import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
config();

let dataDir: string;

if (!process.env.DATA_DIR || process.env.DATA_DIR === "") {
  dataDir = "./data";
  console.warn("DATA_DIR is not set, using default ./data");
} else dataDir = process.env.DATA_DIR;

export function getFile(bucket: string, file: string) {
  const safeFile = path.normalize(file);
  const safeBucket = path.normalize(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  const filePath = path.join(bucketPath, safeFile);

  if (!fs.existsSync(filePath)) return null;

  return fs.readFileSync(filePath);
}

export const streamFile = (bucket: string, file: string) => {
  const safeFile = path.normalize(file);
  const safeBucket = path.normalize(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  const filePath = path.join(bucketPath, safeFile);

  if (!fs.existsSync(filePath)) return null;

  return fs.createReadStream(filePath);
};

export const deleteFile = (bucket: string, file: string) => {
  const safeFile = path.normalize(file);
  const safeBucket = path.normalize(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  const filePath = path.join(bucketPath, safeFile);

  if (!fs.existsSync(filePath)) return null;

  fs.unlinkSync(filePath);
};

export const uploadFile = (bucket: string, file: string, data: Buffer) => {
  const safeFile = path.normalize(file);
  const safeBucket = path.normalize(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  const filePath = path.join(bucketPath, safeFile);

  if (!fs.existsSync(bucketPath)) fs.mkdirSync(bucketPath);

  fs.writeFileSync(filePath, data);
};

export function getFiles(bucket: string) {
  const safeBucket = path.normalize(bucket);
  const bucketPath = path.join(dataDir, safeBucket);
  if (!fs.existsSync(bucketPath)) return null;

  return fs.readdirSync(bucketPath);
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