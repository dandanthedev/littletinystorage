import { config } from "dotenv";
config();

import { url } from "../test.js";
import fs from "fs";

export const name = "Bucket-env applies";

export async function test(logger) {
    const buckets = process.env.BUCKETS?.split(",");

    if (!buckets.length) {
        logger("No buckets specified in .env file");
        return false;
    }

    let hadPublic = false;
    let hadDir = false;

    for (const bucket of buckets) {
        bucket = bucket.toUpperCase();
        if (process.env[`${bucket}_PUBLIC`] === "true") {
            hadPublic = true;
            //add test file to bucket
            fs.writeFileSync(`./data/${bucket}/LTSTestFile.txt`, "test");
            const fetchURL = `${url}/${bucket}/LTSTestFile.txt`;
            logger("Attempting to access file at " + fetchURL);
            const res = await fetch(fetchURL);
            if (res.ok) {
                logger(`File accessible in ${bucket} bucket`);
            } else {
                logger(`File not accessible in ${bucket} bucket`);
                return false;
            }
        }
        if (process.env[`${bucket}_DIR`] === "true") {
            hadDir = true;
            const fetchURL = `${url}/${bucket}`;
            logger("Attempting to access directory at " + fetchURL);
            const dir = await fetch(fetchURL);
            if (dir.ok) {
                logger(`Directory accessible in ${bucket} bucket`);
            } else {
                logger(`Directory not accessible in ${bucket} bucket`);
                return false;
            }
        }
    }

    if (!hadPublic || !hadDir) {
        logger("Test could not be fully completed because no buckets had public or directory access, or both");
        return false;
    }
    return true;
}