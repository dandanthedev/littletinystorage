import { config } from "dotenv";
config();

import { url } from "../test.js";

export const name = "Hammer Test";

export async function test(logger) {
    const toFetch = [
        "/", `/${process.env.BUCKETS?.split(",")[0]}`,
        "/api", `/api/${process.env.BUCKETS?.split(",")[0]}`, `/api/${process.env.BUCKETS?.split(",")[0]}/hello`,
    ]

    for (const fetchURL of toFetch) {
        logger("Attempting to access " + fetchURL);
        const res = await fetch(`${url}${fetchURL}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.API_KEY}`,
            }
        });
        if (res.ok) {
            logger(`Accessible at ${fetchURL}`);
        } else {
            logger(`Not accessible at ${fetchURL}`);
            return false;
        }
    }
    return true;
}