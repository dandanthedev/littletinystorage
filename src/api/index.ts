import { IncomingMessage, ServerResponse } from "http";
import { resp } from "../utils.js";
import * as fs from "fs";
import * as path from "path";

import checkToken from "./checkToken.js";
import generateToken from "./generateToken.js";
import hello from "./hello.js";
import { getURLParam } from "../utils.js";

const routes = [
  {
    path: "checkToken",
    handler: checkToken,
  },
  {
    path: "generateToken",
    handler: generateToken,
  },
  {
    path: "hello",
    handler: hello,
  },
];

export async function handleAPIRequest(
  req: IncomingMessage,
  res: ServerResponse,
  params: URLSearchParams,
  env: any
) {
  const buckets = env.buckets;
  const bucket = getURLParam(req?.url ?? "", 2);
  const apiPath = getURLParam(req?.url ?? "", 3);
  console.log(req.url, bucket, apiPath);
  if (!bucket || !apiPath)
    return resp(
      res,
      200,
      "Welcome to the API, please provide a bucket and an action to perform."
    );

  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith("Bearer ")
  )
    return resp(res, 401, "Authorization required");

  if (req.headers.authorization.split(" ")[1] !== process.env.API_KEY)
    return resp(res, 401, "Invalid API key");

  console.log(bucket);
  if (!buckets.includes(bucket)) return resp(res, 400, "Invalid bucket");

  const route = routes.find((route) => route.path === apiPath);
  if (!route) return resp(res, 400, `i dont know how to ${apiPath}`);
  return await route.handler(req, res, params, resp, {
    buckets,
    bucket,
  });
}

export type ExtraInfo = {
  buckets: string[];
  bucket: string;
};
