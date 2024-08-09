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
  let fileName = req.url.replace("/", "");
  if (!fileName) fileName = "index.html";

  const exts = ["js", "css", "png"];

  if (
    fileName &&
    !fileName.endsWith(".html") &&
    !exts.map((ext) => fileName.endsWith("." + ext)).includes(true) //most cursed thing i've ever seen but it works
  ) {
    fileName = fileName + ".html";
    if (!fs.existsSync(path.join("./web", fileName))) return resp(res, 404);
  }

  if (fileName) {
    const file = fs.createReadStream(path.join("./web", fileName));
    const mimeType = mime.default.getType(fileName);
    return resp(res, 200, file, "file", mimeType ?? undefined);
  }
};
