const {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} = require("@aws-sdk/client-s3");
const fs = require("fs");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  signer: undefined, // ✅ disables S3 Express
  forcePathStyle: true, // optional
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_BUCKET_NAME;

async function uploadToS3(filePath, key) {
  const stats = fs.statSync(filePath);
  const fileSize = stats.size;

  if (fileSize < 5 * 1024 * 1024 * 1024) {
    // ✅ Simple upload
    const fileStream = fs.createReadStream(filePath);
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: fileStream,
        ContentType: "application/octet-stream",
      })
    );
  } else {
    // 🚀 Multipart upload for large files
    const createUpload = await s3.send(
      new CreateMultipartUploadCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );

    const uploadId = createUpload.UploadId;
    const partSize = 50 * 1024 * 1024; // 50MB
    const fileStream = fs.createReadStream(filePath, {
      highWaterMark: partSize,
    });

    let partNumber = 1;
    const parts = [];

    for await (const chunk of fileStream) {
      const uploadPart = await s3.send(
        new UploadPartCommand({
          Bucket: BUCKET,
          Key: key,
          PartNumber: partNumber,
          UploadId: uploadId,
          Body: chunk,
        })
      );

      parts.push({ ETag: uploadPart.ETag, PartNumber: partNumber });
      partNumber++;
    }

    await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: BUCKET,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      })
    );
  }

  return key;
}

module.exports = { uploadToS3 };

// 1️⃣ Import required modules
// const {
//   S3Client,
//   PutObjectCommand,
//   CreateMultipartUploadCommand,
//   UploadPartCommand,
//   CompleteMultipartUploadCommand,
// } = require("@aws-sdk/client-s3");

// Here, you are importing classes and commands from the AWS SDK for JavaScript (v3).

// S3Client → The main client used to communicate with S3.

// PutObjectCommand → Command to upload a single file.

// CreateMultipartUploadCommand → Starts a multipart upload (for large files).

// UploadPartCommand → Uploads a single part of a large file.

// CompleteMultipartUploadCommand → Completes the multipart upload once all parts are uploaded.

// const fs = require("fs");

// Imports Node.js’ file system module, which allows reading files from your local disk.

// 2️⃣ Initialize S3 client
// const s3 = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY,
//     secretAccessKey: process.env.AWS_SECRET_KEY,
//   },
// });

// Creates a new S3 client using your AWS credentials and region.

// process.env.* → Values are taken from environment variables.

// This client will be used to send all requests to S3.

// const BUCKET = process.env.AWS_BUCKET_NAME;

// Stores the S3 bucket name from an environment variable for easy reference.

// 3️⃣ Define the upload function
// async function uploadToS3(filePath, key) {

// Declares an async function uploadToS3.

// filePath → Path to the local file to upload.

// key → The name (key) of the file in S3.

//   const stats = fs.statSync(filePath);
//   const fileSize = stats.size;

// fs.statSync(filePath) → Gets file metadata (size, creation date, etc.).

// fileSize → Stores the file size in bytes.

// 4️⃣ Handle small files (<5GB)
//   if (fileSize < 5 * 1024 * 1024 * 1024) {

// Checks if the file is smaller than 5GB (the S3 limit for a single PutObject upload).

//     const fileStream = fs.createReadStream(filePath);

// Creates a readable stream from the local file.

// Streams allow large files to be read piece by piece instead of loading the whole file into memory.

//     await s3.send(
//       new PutObjectCommand({
//         Bucket: BUCKET,
//         Key: key,
//         Body: fileStream,
//         ContentType: "application/octet-stream",
//       })
//     );

// Sends a PutObjectCommand to S3 to upload the file.

// Bucket → Target S3 bucket.

// Key → S3 object key (filename).

// Body → File data stream.

// ContentType → MIME type (here generic binary).

// 5️⃣ Handle large files (>5GB) using multipart upload
//   } else {

// If the file is larger than 5GB, we use multipart upload.

//     const createUpload = await s3.send(
//       new CreateMultipartUploadCommand({
//         Bucket: BUCKET,
//         Key: key,
//       })
//     );

// Initiates a multipart upload.

// Returns an UploadId, which identifies this upload session.

//     const uploadId = createUpload.UploadId;
//     const partSize = 50 * 1024 * 1024; // 50MB

// uploadId → Required for uploading individual parts.

// partSize → Each chunk will be 50MB.

//     const fileStream = fs.createReadStream(filePath, {
//       highWaterMark: partSize,
//     });

// Creates a readable stream with a highWaterMark of 50MB.

// This means the stream reads 50MB chunks at a time.

// 6️⃣ Upload each part
//     let partNumber = 1;
//     const parts = [];

// partNumber → Tracks the index of each part (S3 requires part numbers starting from 1).

// parts → Stores uploaded part info (ETags) for final completion.

//     for await (const chunk of fileStream) {

// Async iteration over the file stream → reads one chunk at a time.

//       const uploadPart = await s3.send(
//         new UploadPartCommand({
//           Bucket: BUCKET,
//           Key: key,
//           PartNumber: partNumber,
//           UploadId: uploadId,
//           Body: chunk,
//         })
//       );

// Uploads the current chunk using UploadPartCommand.

// PartNumber → Position in the multipart upload.

// UploadId → Associates the part with the upload session.

// Body → The chunk data.

//       parts.push({ ETag: uploadPart.ETag, PartNumber: partNumber });
//       partNumber++;

// Stores the returned ETag for each part (S3 uses this to verify the integrity of each part).

// Increments the part number for the next chunk.

// 7️⃣ Complete the multipart upload
//     await s3.send(
//       new CompleteMultipartUploadCommand({
//         Bucket: BUCKET,
//         Key: key,
//         UploadId: uploadId,
//         MultipartUpload: { Parts: parts },
//       })
//     );

// Tells S3 that all parts are uploaded and to assemble them into a single file.

// MultipartUpload: { Parts: parts } → Provides the list of parts and their ETags.

// 8️⃣ Return the uploaded file key
//   return key;
// }

// Returns the S3 key of the uploaded file.

// 9️⃣ Export the function
// module.exports = { uploadToS3 };

// Makes the uploadToS3 function available for other modules in Node.js.
