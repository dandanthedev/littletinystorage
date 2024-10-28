import { IncomingMessage, ServerResponse } from "http";
import { resp } from "../utils.js";
import * as fs from "fs";
import * as path from "path";

import checkToken from "./checkToken.js";
import generateToken from "./generateToken.js";
import hello from "./hello.js";
import ping from "./ping.js";
import authed from "./authed.js";
import buckets from "./buckets.js";
import files from "./files.js";
import getEnv from "./getEnv.js";
import setEnv from "./setEnv.js";

import { getURLParam } from "../utils.js";

const routes = [
  {
    path: "token",
    handler: checkToken,
    method: "GET",
  },
  {
    path: "token",
    handler: generateToken,
    method: "POST",
  },
  {
    path: "hello",
    handler: hello,
    method: "GET",
  },
  {
    path: "files",
    handler: files,
    method: "GET",
  },
];

const unauthedRoutes = [
  {
    path: "ping",
    handler: ping,
    method: "GET",
  },
];

const authedRoutes = [
  ...unauthedRoutes,
  {
    path: "authed",
    handler: authed,
    method: "GET",
  },
  {
    path: "buckets",
    handler: buckets,
    method: "GET",
  },
  {
    path: "env", //EXTRA REMINDER TO NEVER ALLOW PUBLIC ACCESS TO THIS!!!!
    handler: getEnv,
    method: "GET",
  },
  {
    path: "env", //EXTRA REMINDER TO NEVER ALLOW PUBLIC ACCESS TO THIS!!!!
    handler: setEnv,
    method: "POST",
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

  if (bucket && !apiPath && !req.headers.authorization) {
    const route = unauthedRoutes.find(
      (route) => route.path === bucket && route.method === req.method
    );
    if (route)
      return await route.handler(req, res, params, resp, {
        buckets,
        bucket,
      });
  }
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith("Bearer ")
  )
    return resp(res, 401, "Authorization required");

  if (req.headers.authorization.split(" ")[1] !== process.env.API_KEY)
    return resp(res, 401, "Invalid API key");

  if (bucket && !apiPath) {
    const route = authedRoutes.find(
      (route) => route.path === bucket && route.method === req.method
    );
    if (route)
      return await route.handler(req, res, params, resp, {
        buckets,
        bucket,
      });
  }

  if (!bucket || !apiPath)
    return resp(
      res,
      200,
      "Welcome to the API, please provide a bucket and an action to perform."
    );

  if (!buckets.includes(bucket)) return resp(res, 400, "Invalid bucket");

  const route = routes.find(
    (route) => route.path === apiPath && route.method === req.method
  );
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
