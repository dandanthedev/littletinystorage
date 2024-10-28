import { config } from "dotenv";
config();

import { get, IncomingMessage, ServerResponse } from "http";
import { resp, buckets, getURLParam } from "./utils.js";
import {
  pipeFile,
  pipeFileStream,
  streamFile,
  getFilesAWS,
  getETag,
  deleteFile,
  getFileStats,
} from "./reader.js";

type HTTPMethod = "GET" | "PUT" | "POST" | "PATCH" | "DELETE";

export const requestListener = async function (
  req: IncomingMessage,
  res: ServerResponse
) {
  if (!req.url) return resp(res, 400, "Invalid request");
  const query = req.url.split("?")[1];
  const qParams = new URLSearchParams(query);

  if (process.env.DEBUG) console.log(req.method, req.url, req.headers);

  const authorization = req.headers.authorization;

  if (!authorization) return resp(res, 401, "AuthorizationMissing", "awsError");

  const credential = authorization.split("Credential=")[1];
  if (!credential) return resp(res, 401, "CredentialMissing", "awsError");
  const endCredential = credential.split("/")[0];

  if (process.env.S3_KEY_SECRET !== endCredential)
    return resp(res, 401, "CredentialNotValid", "awsError");

  const bucket = getURLParam(req.url, 1, false);

  //ListBuckets
  if (!bucket && req.method === "GET") {
    return resp(
      res,
      200,
      {
        ListAllMyBucketsResult: {
          Owner: {
            ID: "123456789012",
            DisplayName: "LittleTinyStorage",
          },
          Buckets: buckets.map((bucket) => {
            return {
              Bucket: {
                Name: bucket,
                CreationDate: new Date().toISOString(),
              },
            };
          }),
        },
      },
      "xml"
    );
  }

  if (!buckets.includes(bucket ?? ""))
    return resp(res, 404, "WeOnlySupportURLBuckets", "awsError");

  const file = getURLParam(req.url, 2, true);

  //HEAD key
  if (bucket && file && req.method === "HEAD") {
    const stats = getFileStats(bucket, file);
    if (!stats) return resp(res, 404, "FileNotFound", "awsError");
    const length = stats.size;
    res.setHeader("Content-Length", length.toString());
    return resp(res, 204);
  }

  //DownloadObject
  if (bucket && file && req.method === "GET") {
    const stream = streamFile(bucket, file);
    if (!stream) return resp(res, 404, "FileNotFound", "awsError");
    return resp(res, 200, stream);
  }

  //ListObjects(V2)
  if (bucket && !file && req.method === "GET") {
    if (!bucket || !buckets.includes(bucket))
      return resp(res, 404, "Bucket not found", "awsError");
    const files = getFilesAWS(bucket);
    return resp(
      res,
      200,
      `
  <ListBucketResult>
    <Name>${bucket}</Name>
      ${files?.map((file) => {
        return file;
      })}
    <IsTruncated>false</IsTruncated>
    <Prefix></Prefix>
    <Marker></Marker>
    <MaxKeys>${files?.length ?? 0}</MaxKeys>
  </ListBucketResult>   
      `,
      "xml"
    );
  }

  //PutObject
  if (
    bucket &&
    file &&
    req.method === "PUT" &&
    !req.headers["x-amz-copy-source"]
  ) {
    if (!bucket) return resp(res, 400, "BucketMissing", "awsError");

    const contentType = req.headers["content-type"];
    if (!contentType)
      return resp(res, 400, "NameOrContentTypeMissing", "awsError");

    //pipe body to file
    await pipeFile(bucket, file, req);

    return resp(res, 200);
  }

  //CopyObject
  if (bucket && file && req.method === "PUT") {
    let source = req.headers["x-amz-copy-source"];
    if (Array.isArray(source)) source = source[0];

    if (!source) return resp(res, 400, "SourceMissing", "awsError");

    const sourceSplit = source?.split("/");
    const sourceBucket = decodeURIComponent(sourceSplit?.[1]);
    const sourceKey = decodeURIComponent(sourceSplit?.[2]);
    if (!sourceBucket || !sourceKey)
      return resp(res, 400, "SourceMissing", "awsError");

    console.log("Copying", sourceBucket, sourceKey, "to", bucket, file);

    const sourceStream = streamFile(sourceBucket, sourceKey);

    if (!sourceStream) return resp(res, 404, "SourceFileNotFound", "awsError");

    if (typeof sourceStream === "string")
      return resp(res, 400, sourceStream, "awsError");

    await pipeFileStream(bucket, file, sourceStream);

    return resp(
      res,
      200,
      {
        CopyObjectResult: {
          LastModified: new Date().toISOString(),
          ETag: getETag(bucket, file),
        },
      },
      "xml"
    );
  }

  //DeleteObject
  if (bucket && file && req.method === "DELETE") {
    if (!bucket) return resp(res, 400, "BucketMissing", "awsError");

    const key = getURLParam(req.url, 2, true);
    if (!key) return resp(res, 400, "KeyMissing", "awsError");

    const result = deleteFile(bucket, key);
    if (!result) return resp(res, 404, "KeyNotFound", "awsError");

    return resp(res, 204);
  }

  return resp(
    res,
    404,
    {
      Error: {
        Code: "NotImplemented",
        Message:
          "This action is not yet implemented. Please create an issue on GitHub if you need it",
      },
    },
    "xml"
  );
};
