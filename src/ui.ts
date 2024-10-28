import { IncomingMessage, ServerResponse } from "http";
import * as fs from "fs";
import * as path from "path";
import * as mime from "mime";
import { resp } from "./utils.js";

export const requestListener = async function (
  req: IncomingMessage,
  res: ServerResponse
) {
  if (!req.url) return;
  //send files from ./web directory
  let fileName = req.url.replace("/", "").split("?")[0];
  if (!fileName) fileName = "index.html";

  const exts = ["js", "css", "png"];

  if (
    fileName &&
    !fileName.endsWith(".html") &&
    !exts.map((ext) => fileName.endsWith("." + ext)).includes(true) //most cursed thing i've ever seen but it works
  ) {
    fileName = fileName + ".html";
  }

  if (!fs.existsSync(path.join("./web", fileName))) return resp(res, 404);

  if (fileName) {
    const file = fs.createReadStream(path.join("./web", fileName));
    let mimeType;
    if (fileName.endsWith(".html")) mimeType = "text/html";
    else if (fileName.endsWith(".css")) mimeType = "text/css";
    else if (fileName.endsWith(".js")) mimeType = "text/javascript";
    else if (fileName.endsWith(".png")) mimeType = "image/png";
    else if (fileName.endsWith(".json")) mimeType = "application/json";
    return resp(res, 200, file, "file", mimeType ?? undefined);
  }
};
