import { IncomingMessage } from "http";
import { ExtraInfo } from ".";
import { verifyToken } from "../jwt.js";
export default async function handle(
  req: IncomingMessage,
  res: any,
  params: URLSearchParams,
  resp: Function,
  extra: ExtraInfo
) {
  const token = params.get("token");

  if (!token) return resp(res, 400, "Token required");

  const { authorized, timeLeft, decoded } = await verifyToken(
    token,
    extra.bucket,
    null,
    null
  );
  if (!authorized)
    return resp(
      res,
      401,
      "Token is not valid or not authorized for this bucket"
    );

  return resp(
    res,
    200,
    JSON.stringify({
      ...decoded,
      timeLeft,
      iat: undefined,
      exp: undefined,
    }),
    "json"
  );
}
