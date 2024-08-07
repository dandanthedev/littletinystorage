require('dotenv').config();
const ora = require('ora-classic');
const http = require('http');
const fs = require('fs');
const path = require('path');

const { handleAPIRequest } = require('./api');
const { verifyToken } = require('./jwt');

const buckets = process.env.BUCKETS.split(',');
const dataDir = process.env.DATA_DIR || './data';

const port = process.env.PORT ?? 7999;

const directoryTemplate = fs.readFileSync('./directory.html', 'utf8');

function resp(res, status, body, type) {
    if (type) {
        if (type === "json") res.setHeader('Content-Type', 'application/json');
        if (type === "html") res.setHeader('Content-Type', 'text/html');
        if (type === "file") res.setHeader('Content-Type', 'application/octet-stream');
    }
    res.writeHead(status);
    res.end(body);
}

const requestListener = async function (req, res) {
    const query = req.url.split("?")[1];
    const params = new URLSearchParams(query);

    if (req.url.startsWith("/api")) return await handleAPIRequest(req, res, params, resp, {
        buckets
    });


    if (req.url === "/") return resp(res, 200, process.env.WELCOME_MESSAGE ?? "LittleTinyStorage");
    const bucket = req.url.split('/')[1].split("/")[0];
    if (!buckets.includes(bucket)) return resp(res, 404, "Bucket not found");
    const file = req.url.split('/')[2] ? req.url.split('/')[2].split("?")[0] : null;

    console.log(params);
    console.log(file);
    if (!file) {
        if (process.env[bucket + "_DIR"] === "true" && fs.existsSync(path.join(dataDir, bucket))) {


            const files = fs.readdirSync(path.join(dataDir, bucket));

            let directoryListing = directoryTemplate;

            const filesInListing = [];

            const perFileStart = directoryTemplate.split('{#file}')
            const perFile = perFileStart[1].split('{/file}')[0];

            if (!perFile) {
                console.error("Could not find file template in directory.html");
                return res.end("The directory listing has not been set up correctly.");
            }
            files.forEach(file => {
                const fileListing = perFile.replaceAll('{{file}}', file);
                filesInListing.push(fileListing);
            });

            //replace perFile with the filesInListing
            directoryListing = directoryListing.replace(`{#file}${perFile}{/file}`, filesInListing.join(''));

            directoryListing = directoryListing.replaceAll('{{bucket}}', bucket);

            return resp(res, 200, directoryListing, "html");


        } else {
            return resp(res, 400, "Directory listing is disabled for this bucket");
        }

    } else {
        let type;
        if (req.method === "GET") type = "download";
        else if (req.method === "POST") type = "upload";
        else if (req.method === "DELETE") type = "delete";
        else if (req.method === "PUT") type = "rename";
        else return resp(res, 400, "Invalid method");

        const filePath = path.join(dataDir, bucket, file);


        if (process.env[bucket + "_PUBLIC"] === "true" && type === "download") {
            if (!fs.existsSync(filePath)) return resp(res, 404);
            return resp(res, 200, fs.readFileSync(filePath), "file");
        }



        //authorization is required
        if (!params.has('key')) return resp(res, 401, "Key required");

        const key = params.get('key');


        const { authorized, timeLeft, decoded } = await verifyToken(key, bucket, file, type);
        if (!authorized) return resp(res, 401, "Token is not valid or not authorized to perform this action");

        res.setHeader("Bucket", bucket);

        res.setHeader('Token-ExpiresIn', timeLeft ?? "never");
        res.setHeader("Token-File", decoded.file ?? "any");
        res.setHeader("Token-Type", decoded.type ?? "any");

        if (type === "download") {
            if (!fs.existsSync(filePath)) return resp(res, 404);
            return resp(res, 200, fs.readFileSync(filePath), "file");
        }
        if (type === "upload") {
            const data = await new Promise(resolve => {
                const chunks = [];
                req.on('data', chunk => {
                    chunks.push(chunk);
                });
                req.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });
            });
            fs.writeFileSync(filePath, data);
            return resp(res, 200);
        }
        if (type === "delete") {
            if (!fs.existsSync(filePath)) return resp(res, 404, "File not found");
            fs.unlinkSync(filePath);
            return resp(res, 200);
        }
        if (type === "rename") {
            if (!fs.existsSync(filePath)) return resp(res, 404, "File not found");
            const newName = params.get('name');
            const newBucket = params.get('bucket');

            if (!newName && !newBucket) return resp(res, 400, "Please provide a new name or a new bucket, or both");

            if (newBucket && process.env.MOVING_ACROSS_BUCKETS !== "true") return resp(res, 400, "Moving files across buckets is disabled");

            const nameToSet = newName ?? file;
            const bucketToSet = newBucket ?? bucket;

            fs.renameSync(filePath, path.join(dataDir, bucketToSet, nameToSet));
            return resp(res, 200);
        }


    }
}

const spinner = ora('Loading...').start();

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

if (buckets.length == 0) console.error("Please set up some buckets in the .env file");
buckets.forEach(bucket => {
    const bucketPath = path.join(dataDir, bucket);
    if (!fs.existsSync(bucketPath)) {
        fs.mkdirSync(bucketPath);
        //create __internal__ directory
        if (!fs.existsSync(path.join(bucketPath, '__internal__'))) {
            fs.mkdirSync(path.join(bucketPath, '__internal__'));
        }
    }
});
if (process.env.DELETE_BUCKETS_WHEN_ENV_REMOVED === "true") {
    const bucketDirs = fs.readdirSync(dataDir);
    bucketDirs.forEach(bucket => {
        if (buckets.indexOf(bucket) === -1) {
            const bucketPath = path.join(dataDir, bucket);
            fs.rmdirSync(bucketPath, { recursive: true });
        }
    });
}


http.createServer(requestListener).listen(port);
spinner.succeed("Server running on port " + port);