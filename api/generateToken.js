const { generateSignedToken } = require('../jwt');

async function handle(req, res, params, resp, extra) {
    const { bucket, buckets } = extra;
    const file = params.get('file');
    const type = params.get('type');
    const expiresIn = params.get('expiresIn');

    console.log(bucket, file, type, expiresIn);

    if (!buckets.includes(bucket)) return resp(res, 400, "Invalid bucket");

    if (type && ["upload", "download", "delete", "rename"].indexOf(type) === -1) return resp(res, 400, "Invalid type");

    const token = await generateSignedToken(bucket, file, type, expiresIn);

    resp(res, 200, token);
}

module.exports = {
    handle
}