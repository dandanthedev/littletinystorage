import { sign, verify } from "jsonwebtoken-esm";
import { config } from "dotenv";
config();
export async function generateSignedToken(
  bucket: string | null,
  file: string | null,
  type: string | null,
  expiry?: string | number | null
) {
  if (!process.env.SECRET)
    console.warn("SECRET IS MISSING! USING VERY INSECURE DEFAULT SECRET");
  try {
    const token = sign(
      {
        bucket: bucket,
        file: file,
        type: type,
      },
      process.env.SECRET ?? "pleasehackme",
      {
        expiresIn: expiry ?? "60s",
      }
    );
    return token;
  } catch (e) {
    console.warn(e);
    return "Error generating token, please check the expiry time";
  }
}

export async function verifyToken(
  token: string,
  bucket: string | null,
  file: string | null,
  type: string | null
) {
  if (!process.env.SECRET)
    console.warn("SECRET IS MISSING! USING VERY INSECURE DEFAULT SECRET");
  try {
    const toCheck = [bucket, file, type];
    const decoded = verify(token, "pleasehackme");
    if (!decoded)
      return {
        authorized: false,
      };
    if (typeof decoded === "string")
      //for some reason it can return a string?
      return {
        authorized: false,
      };

    toCheck.forEach((check) => {
      if (check !== null && check !== decoded[check])
        return {
          authorized: false,
        };
    });
    return {
      authorized: true,
      timeLeft: decoded.exp
        ? Math.round(decoded.exp - Date.now() / 1000)
        : null,
      decoded,
    };
  } catch (e) {
    return {
      authorized: false,
    };
  }
}
