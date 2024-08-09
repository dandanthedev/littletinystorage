import { IncomingMessage, ServerResponse } from "http";
import { resp, buckets } from "./utils.js";
import { getFilesAWS } from "./reader.js";
export const requestListener = async function (
  req: IncomingMessage,
  res: ServerResponse
) {
  //get body
  const body = await new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      resolve(body);
    });
  });
  console.log(req.url, req.method, req.headers, body);
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
