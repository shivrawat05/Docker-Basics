const {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const BUCKET = process.env.AWS_BUCKET_NAME;

async function uploadS3(filePath, key) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  if (fileSize < 5 * 1024 * 1024 * 1024) {
    const fileStream = fs.createReadStream(filePath);
    await s3.send(
      new PutObjectCommand({
        BUCKET: BUCKET,
        key: key,
        body: fileStream,
        contentType: "application/octet-stream",
      })
    );
  } else {
    const createUpload = await s3.send(
      new CreateMultipartUploadCommand({
        BUCKET: BUCKET,
        key: key,
      })
    );

    const uploadId = createUpload.UploadId;
    const partSize = 50 * 1024 * 1024;
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
}
