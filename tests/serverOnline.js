import { url } from "../test.js";

export const name = "Server Online";

export async function test() {
    const res = await fetch(url);
    return res.ok;
};