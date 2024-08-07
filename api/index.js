const fs = require('fs');
const path = require('path');

const checkToken = require('./checkToken');
const generateToken = require('./generateToken');
const hello = require('./hello');

const routes = [{
    path: 'checkToken',
    handler: checkToken.handle
},
{
    path: 'generateToken',
    handler: generateToken.handle
},
{
    path: 'hello',
    handler: hello.handle
}]


async function handleAPIRequest(req, res, params, resp, env) {
    const buckets = env.buckets;

    const bucket = req.url.split('/')[2];
    const apiPath = req.url.split('/')[3] ? req.url.split('/')[3].split("?")[0] : null;
    console.log(req.url, bucket, apiPath);
    if (!bucket || !apiPath) return resp(res, 400, "Welcome to the API, please provide a bucket and an action to perform.");

    if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer "))
        return resp(res, 401, "Authorization required");



    if (req.headers.authorization.split(' ')[1] !== process.env.API_KEY)
        return resp(res, 401, "Invalid API key");


    console.log(bucket);
    if (!buckets.includes(bucket)) return resp(res, 400, "Invalid bucket");

    const route = routes.find(route => route.path === apiPath);
    if (!route) return resp(res, 400, `i dont know how to ${apiPath}`);
    return await route.handler(req, res, params, resp, {
        buckets,
        bucket
    });


}

module.exports = {
    handleAPIRequest
}