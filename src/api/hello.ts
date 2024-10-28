import { IncomingMessage } from "http";
import { ExtraInfo } from ".";

export default async function handle(
  req: IncomingMessage,
  res: any,
  params: URLSearchParams,
  resp: Function,
  extra: ExtraInfo
) {
  return resp(res, 200, `Welcome to ${extra.bucket}!`);
}
