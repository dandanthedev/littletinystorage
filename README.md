<div align="center">
<img src="https://github.com/dandanthedev/LittleTinyStorage/blob/main/logo.png?raw=true" width="200" height="200">

# LittleTinyStorage

A Little Tiny (S3 compatible) file storage server

> Note: This project is still in early development. It should be fully functional, but there might be bugs. If you find any, please report them!

</div>

## Features

- Get, upload, delete and rename files (across buckets!)
- Upload using presigned URLs
- Download using presigned URLs (private buckets)
- Store files as, well... files!
- Directory listings
- Store on your own server
- Completely configured using environment variables
- A web interface for managing your buckets and files

## Setup

The easiest way to get started is downloading the latest release from the [releases page](https://github.com/dandanthedev/LittleTinyStorage/releases).
Alternatively, you can use the [docker image](https://github.com/dandanthedev/littletinystorage/pkgs/container/littletinystorage)

If you want to build it yourself, follow these steps:

1. Clone the repository
2. Rename the .env.example file to .env
3. Fill in the .env file with your own settings
4. Run `npm install`
5. Run `node index.js`
6. LittleTinyStorage is now running on port 7999, 7998 and 7997! (unless other ports are specified in the .env file)

## S3 Compatibility

LittleTinyStorage is partially compatible with S3 clients. Here's a list of the commands that are currently implemented:

- ListBuckets
- ListObjects(V2)
- PutObject
- CopyObject
- DeleteObject

As you can see, signed URLs are not yet supported. I'd recommend using the LTS api for this for now, as it's much easier to use.

### Authentication

I've not managed to get normal S3 authentication to work yet, so I'm using a different method for now:

The `S3_KEY_SECRET` environment variable is the accessKeyId. The secret key is not used, but can be anything. This will be fixed in the future.

## Usage

LittleTinyStorage is a REST API. You can use it with any HTTP client, like Postman or cURL.
The API does not use JSON, but returns data in plaintext.

## HEAD

The HEAD method is used to get the file size without downloading the file. This can be useful for checking if a file exists or is accessible without downloading it.

```
HEAD /:bucket/:file
```

Example:

```
HEAD /mybucket/myfile.txt
```

## Get a file

```
GET /:bucket/:file
```

Example:

```
GET /mybucket/myfile.txt
GET /mysupersecurebucket/taxfraud.txt?key={PRESIGNED_KEY}
```

## Upload a file

```
POST /:bucket/:file
```

Example:

```
POST /mysupersecurebucket/taxfraud.txt?key={PRESIGNED_KEY}
Use the raw body of the request to upload the file.
```

## Delete a file

```
DELETE /:bucket/:file
```

Example:

```
DELETE /mybucket/browserhistory.db?key={PRESIGNED_KEY}
```

## Rename a file

```
PUT /:bucket/:file
```

Example:

```
PUT /mybucket/taxfraud.txt?bucket=mysupersecurebucket&key={PRESIGNED_KEY}
PUT /mybucket/taxfraud.txt?name=groceries.txt&key={PRESIGNED_KEY}
PUT /mybucket/taxfraud.txt?name=groceries.txt&bucket=mysupersecurebucket&key={PRESIGNED_KEY}
```

## API

The API is used for things that are not related to specific files, like checking if a token is valid or generating a new token.
API requests are always in this format: `/api/:bucket/:action?args=blegh` and require an `Authorization` header with the value `Bearer {API_KEY}`.

## General Routes

These routes are used for general actions not linked to a specific bucket.

### Ping

This endpoint will return a message saying "littletinystorage". It will work even if the api key is invalid.

```
GET /api/ping
```

Example:

```
littletinystorage
```

### Authed

This endpoint will return a message saying "yes" if the api key is valid.

```
GET /api/authed
```

Example:

```
yes
```

### Buckets

This endpoint will return a list of all the buckets that are configured.

```
GET /api/buckets
```

Example:

```
["bucket1", "bucket2"]
```

## Bucket Routes

These routes are used for actions related to a specific bucket.

### Hello!

This endpoint will return a message saying "Welcome to :bucket!" if the bucket is valid.

```
GET /api/:bucket/hello
```

Example:

```
Welcome to bucket1!
```

### Check a token

This endpoint will return the decoded token if the token is valid. The values marked as `null` are wildcards, meaning that they can be anything.

> Note: These details are also returned in the response header when running operations on a file using a token.

```
GET /api/:bucket/token?token={TOKEN}
```

Example:

```
{
	"bucket": "bucket1",
	"file": null,
	"type": null,
	"timeLeft": 1416
}
```

### Generate a token

This endpoint will generate a token for the specified bucket, file and type. The token will be valid for the specified amount of time (or 60s if not specified).
All fields are optional, and will count as wildcards if not specified.

| **Type** | **METHOD** |
| -------- | ---------- |
| download | GET        |
| upload   | POST       |
| rename   | PUT        |
| delete   | DELETE     |

```
POST /api/:bucket/token?file={FILE}&type={TYPE}&expiresIn={EXPIRESIN}
```

Example:

```
POST /api/bucket1/token?file=taxfraud.txt&type=download&expiresIn=60s
POST /api/bucket1/token?file=taxfraud.txt
POST /api/bucket1/token?type=rename
POST /api/bucket1/token?expiresIn=60y
```

## Get a list of files

This endpoint will return a list of all the files in the specified bucket.

```
GET /api/:bucket/files
```

Example:

```
["file1.txt", "file2.txt", "file3.txt"]
```

### Get a list of files + metadata

This endpoint will return a list of all the files in the specified bucket, along with their metadata.

```
GET /api/:bucket/files?metadata=true
```

Example:

```
[{
	"file":"img2.jpg",
	"mimeType":"image/jpeg",
	"size":24125,
	"lastModified":"2024-08-07T21:37:50.471Z"
},
{
	"file":"LTSTestFile.txt",
	"mimeType":"text/plain",
	"size":4,
	"lastModified":"2024-08-08T14:20:30.679Z"
}]
```

### Get the current configuration

This endpoint will return the current configuration of the server.

```
GET /api/env
```

Example:

```
{
    "envType": "file | env",
    "env": [
        {
            "key": "HEYA",
            "value": "true",
            "comment": "Used to check if the .env file is loaded, THIS IS REQUIRED!"
        },
        {
            "key": "PORT",
            "value": "7999",
            "comment": "The port LTS runs on."
        },
	]
}
```

### Set the current configuration

This endpoint will set the current configuration of the server.

```
POST /api/env
```

Example:

```
{
    "envType": "file | env",
    "env": [
        {
            "key": "HEYA",
            "value": "true",
            "comment": "Used to check if the .env file is loaded, THIS IS REQUIRED!"
        },
        {
            "key": "PORT",
            "value": "7999",
            "comment": "The port LTS runs on."
        },
	]
}
```
