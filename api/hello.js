async function handle(req, res, params, resp, extra) {
    return resp(res, 200, `Welcome to ${extra.bucket}!`);
}

module.exports = {
    handle
}