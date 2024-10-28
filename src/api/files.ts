import { IncomingMessage } from "http";
import { ExtraInfo } from ".";
import { getFiles, getFilesAndStats } from "../reader.js";
export default async function handle(
  req: IncomingMessage,
  res: any,
  params: URLSearchParams,
  resp: Function,
  extra: ExtraInfo
) {
  const stats = params.get("metadata") === "true";

  if (!stats) {
    const files = getFiles(extra.bucket);

    return resp(res, 200, files);
  } else {
    const files = getFilesAndStats(extra.bucket);

    return resp(res, 200, files);
  }
}
