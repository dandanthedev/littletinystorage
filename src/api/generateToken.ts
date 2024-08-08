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

  if (!buckets.includes(bucket)) return resp(res, 400, "Invalid bucket");

  if (type && ["upload", "download", "delete", "rename"].indexOf(type) === -1)
    return resp(res, 400, "Invalid type");

  const token = await generateSignedToken(bucket, file, type, expiresIn);

  resp(res, 200, token);
}
