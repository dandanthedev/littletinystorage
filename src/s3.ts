import { IncomingMessage, ServerResponse } from "http";
import { resp, buckets, getURLParam } from "./utils.js";
import { getFilesAWS, pipeFile } from "./reader.js";
export const requestListener = async function (
  req: IncomingMessage,
  res: ServerResponse
) {
  console.log(req.url, req.method, req.headers);
  if (!req.url) return resp(res, 400, "Invalid request");
  const query = req.url.split("?")[1];
  const qParams = new URLSearchParams(query);
  const bucket = qParams.get("bucket") || req.headers.host?.split(".")[0];
  const action = qParams.get("x-id") || req.url.split("/")[1].split("?")[0];

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

    console.log("Uploading", fileName, contentType, "to", bucket);

    //pipe body to file
    await pipeFile(bucket, fileName, req);

    return resp(res, 200);
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
