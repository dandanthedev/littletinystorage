import * as jose from "jose";
import { config } from "dotenv";
config();

const secret = new TextEncoder().encode(process.env.SECRET ?? "pleasehackme");

export async function generateSignedToken(
  bucket: string | null,
  file: string | null,
  type: string | null,
  expiry?: string | number | null,
  downloadAs?: string | null
) {
  try {
    const token = new jose.SignJWT({
      bucket,
      file,
      type,
      downloadAs,
    });
    token.setExpirationTime(expiry ?? "60s");
    token.setProtectedHeader({
      alg: "HS256",
    });
    token.setIssuedAt();
    return await token.sign(secret);
  } catch (e) {
    console.warn(e);
    return null;
  }
}

export async function verifyToken(
  token: string,
  bucket: string | null,
  file: string | null,
  type: string | null
) {
  try {
    const toCheck = [bucket, file, type];
    const decoded = await jose
      .jwtVerify(token, secret, {
        algorithms: ["HS256"],
      })
      .catch(() => null);

    if (!decoded || !decoded.payload)
      return {
        authorized: false,
      };

    const payload: any = decoded.payload; //todo: fix this

    toCheck.forEach((check) => {
      if (check !== null && check !== payload[check])
        return {
          authorized: false,
        };
    });
    return {
      authorized: true,
      timeLeft: payload.exp
        ? Math.round(payload.exp - Date.now() / 1000)
        : null,
      decoded: payload,
    };
  } catch (e) {
    return {
      authorized: false,
    };
  }
}
