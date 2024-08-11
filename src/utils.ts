import { config } from "dotenv";
config();

import { ServerResponse } from "http";
import { ReadStream } from "fs";
import jstoxml from "jstoxml";

type ResponseType = "json" | "html" | "file" | "xml" | "awsError";
type ResponseBody = string | null | Object;

export function resp(
  res: ServerResponse,
  status?: number,
  body?: ResponseBody,
  type?: ResponseType,
  mimeType?: string
) {
  if (type === "awsError") {
    type = "xml";
    body = {
      Error: {
        Code: body,
      },
    };
  }

  if (type === "xml" && body && typeof body === "object") {
    body = jstoxml.toXML(body);
  }
  if (typeof body === "object" && type === "json") body = JSON.stringify(body);

  if (type && !mimeType) {
    if (type === "json") res.setHeader("Content-Type", "application/json");
    if (type === "html") res.setHeader("Content-Type", "text/html");
    if (type === "xml") res.setHeader("Content-Type", "text/xml");
  }

  if (status) res.writeHead(status);

  if (!type) res.setHeader("Content-Type", "text/plain");
  if (typeof body === "string") {
    res.end(body);
  } else if (body && "pipe" in body && typeof body.pipe === "function") {
    body.pipe(res);
  } else {
    res.end();
  }
}

export function envCheck(bucket: string, setting: string) {
  bucket = bucket.toUpperCase();
  setting = setting.toUpperCase();
  const env = `${bucket}_${setting}`;
  return process.env[env];
}

export function getURLParam(url: string, key: number, andAfter?: boolean) {
  let urlParts = url.split("/");

  const part = urlParts[key];
  if (!part) return null;

  if (andAfter) {
    //add all parts after the key
    const parts = url.split("/").slice(key);
    return decodeURIComponent(parts.join("/").split("?")[0]);
  }

  return decodeURIComponent(part.split("?")[0]);
}

export function getQuery(url: string) {
  const urlParts = url.split("?");
  if (urlParts.length < 2) return new URLSearchParams();
  return new URLSearchParams(urlParts[1]);
}

export const buckets = process.env.BUCKETS?.split(",") ?? [];
export const dataDir = process.env.DATA_DIR || "./data";
