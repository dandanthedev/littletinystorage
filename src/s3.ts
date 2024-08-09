import { config } from "dotenv";
config();

import { IncomingMessage, ServerResponse } from "http";
import { resp, buckets, getURLParam } from "./utils.js";
import {
  pipeFile,
  pipeFileStream,
  streamFile,
  getFilesAWS,
  getETag,
  deleteFile,
} from "./reader.js";
export const requestListener = async function (
  req: IncomingMessage,
  res: ServerResponse
) {
  if (!req.url) return resp(res, 400, "Invalid request");
  const query = req.url.split("?")[1];
  const qParams = new URLSearchParams(query);
  const bucket = qParams.get("bucket") || req.headers.host?.split(".")[0];
  const action = qParams.get("x-id") || req.url.split("/")[1].split("?")[0];

  const authorization = req.headers.authorization;

  if (!authorization) return resp(res, 401, "AuthorizationMissing", "awsError");

  const credential = authorization.split("Credential=")[1];
  if (!credential) return resp(res, 401, "CredentialMissing", "awsError");
  const endCredential = credential.split("/")[0];

  if (process.env.S3_KEY_SECRET !== endCredential)
    return resp(res, 401, "CredentialNotValid", "awsError");

  if (action === "ListBuckets") {
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

  //ListObjects(V2)
  if (action === "") {
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

  if (action === "PutObject") {
    if (!bucket) return resp(res, 400, "BucketMissing", "awsError");

    const fileName = getURLParam(req.url, 1, true);
    const contentType = req.headers["content-type"];
    if (!fileName || !contentType)
      return resp(res, 400, "NameOrContentTypeMissing", "awsError");

    //pipe body to file
    await pipeFile(bucket, fileName, req);

    return resp(res, 200);
  }

  if (action === "CopyObject") {
    if (!bucket) return resp(res, 400, "BucketMissing", "awsError");

    let source = req.headers["x-amz-copy-source"];
    if (Array.isArray(source)) source = source[0];

    if (!source) return resp(res, 400, "SourceMissing", "awsError");

    const sourceSplit = source?.split("/");
    const sourceBucket = sourceSplit?.[0];
    const sourceKey = sourceSplit?.[1];
    if (!sourceBucket || !sourceKey)
      return resp(res, 400, "SourceMissing", "awsError");

    const destKey = getURLParam(req.url, 1, true);
    if (!destKey) return resp(res, 400, "DestinationMissing", "awsError");

    const file = streamFile(sourceBucket, sourceKey);

    if (!file) return resp(res, 404, "SourceFileNotFound", "awsError");

    await pipeFileStream(bucket, destKey, file);

    return resp(
      res,
      200,
      {
        CopyObjectResult: {
          LastModified: new Date().toISOString(),
          ETag: getETag(bucket, destKey),
        },
      },
      "xml"
    );
  }

  if (action === "DeleteObject") {
    if (!bucket) return resp(res, 400, "BucketMissing", "awsError");

    const key = getURLParam(req.url, 1, true);
    if (!key) return resp(res, 400, "KeyMissing", "awsError");

    deleteFile(bucket, key);

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
