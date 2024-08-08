import { config } from "dotenv";
import kleur from "kleur";
config();

import "./dist/index.js"; // Initialize LTS
import fs from "fs";
export const url = `http://localhost:${process.env.PORT || 7999}`;

function testerLogger(message, color, secondaryColor) {
    if (!secondaryColor) console.log(`${kleur.grey(`[Tester]`)} ${kleur.bold(color(message))}`);
    else console.log(`${kleur.grey(`[Tester]`)} ${kleur.bold(color(secondaryColor(message)))}`);
}


const tests = fs.readdirSync("./tests");
testerLogger(`Running ${tests.length} tests...`, kleur.yellow);
let passed = 0;
tests.forEach(async test => {
    const testFile = await import(`./tests/${test}`);
    const testName = testFile.name;
    function logger(message) {
        console.log(`${kleur.yellow(`[${testName}]`)} ${kleur.grey(message)}`);
    }
    const result = await testFile.test(logger);
    if (result !== true) {
        testerLogger(`${testName} failed! 😢`, kleur.bgRed, kleur.white);
        process.exit(1);
    }
    testerLogger(`${testName} passed! 🎉`, kleur.green);
    passed++;
    if (passed === tests.length) {
        testerLogger("All tests passed! 🎉", kleur.bgGreen, kleur.black);
        process.exit(0);
    }

})

