import { IncomingMessage } from "http";
import { ExtraInfo } from ".";
import { generateSignedToken } from "../jwt.js";
export default async function handle(
  req: IncomingMessage,
  res: any,
  params: URLSearchParams,
  resp: Function,
  extra: ExtraInfo
) {
  const { bucket, buckets } = extra;
  const file = params.get("file");
  const type = params.get("type");
  const expiresIn = params.get("expiresIn");
  const downloadAs = params.get("downloadAs");

  if (!buckets.includes(bucket)) return resp(res, 400, "Invalid bucket");

  if (type && ["upload", "download", "delete", "rename"].indexOf(type) === -1)
    return resp(res, 400, "Invalid type");

  if (downloadAs && type && type !== "download")
    return resp(res, 400, "Downloadas can only be used on a download type");

  const token = await generateSignedToken(
    bucket,
    file,
    type,
    expiresIn,
    downloadAs
  );
  if (!token) return resp(res, 400, "Error generating token");

  return resp(res, 200, token);
}
