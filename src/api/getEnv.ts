import { config } from "dotenv";
config();

import { IncomingMessage } from "http";
import { ExtraInfo } from ".";
import * as fs from "fs";

type EnvWithValues = {
  key: string;
  value: string;
  comment?: string;
};

export default async function handle(
  req: IncomingMessage,
  res: any,
  params: URLSearchParams,
  resp: Function,
  extra: ExtraInfo
) {
  const envs = fs.existsSync("./.env.example");
  if (!envs) return resp(res, 400, "No .env.example file found");

  const envFile = fs.readFileSync("./.env.example", "utf8");
  const userEnvFile = fs.existsSync("./.env");

  const envArray = envFile.split("\n");

  const envWithValues: EnvWithValues[] = [];

  //remove empty lines or lines starting with #
  envArray.forEach((line, index) => {
    if (line.trim().startsWith("#") || line.trim() === "") return;
    const key = line.split("=")[0].trim();
    if (process.env[key])
      envWithValues.push({
        key,
        value: process.env[key],
        comment: line.split("#")[1]?.trim(),
      });
    else
      envWithValues.push({
        key,
        value: line.split("=")[1].split("#")[0].trim(),
        comment: line.split("#")[1]?.trim(),
      });
  });

  return resp(
    res,
    200,
    {
      envType: userEnvFile ? "file" : "env",
      env: envWithValues,
    },
    "json"
  );
}
