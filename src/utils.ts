import { config } from "dotenv";
config();

import { ServerResponse } from "http";

type ResponseType = "json" | "html" | "file";
type ResponseBody = string | Buffer;

export function resp(
  res: ServerResponse,
  status: number,
  body?: ResponseBody,
  type?: ResponseType
) {
  if (type) {
    if (type === "json") res.setHeader("Content-Type", "application/json");
    if (type === "html") res.setHeader("Content-Type", "text/html");
    if (type === "file")
      res.setHeader("Content-Type", "application/octet-stream");
  }
  res.writeHead(status);
  res.end(body);
}

export function envCheck(bucket: string, setting: string) {
  bucket = bucket.toUpperCase();
  setting = setting.toUpperCase();
  const env = `${bucket}_${setting}`;
  return process.env[env];
}
export const buckets = process.env.BUCKETS?.split(",") ?? [];
export const dataDir = process.env.DATA_DIR || "./data";
