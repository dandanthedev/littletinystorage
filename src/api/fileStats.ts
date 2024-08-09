import { IncomingMessage } from "http";
import { ExtraInfo } from ".";
import { getFilesAndStats } from "../reader.js";
export default async function handle(
  req: IncomingMessage,
  res: any,
  params: URLSearchParams,
  resp: Function,
  extra: ExtraInfo
) {
  const files = getFilesAndStats(extra.bucket);

  return resp(res, 200, files);
}
