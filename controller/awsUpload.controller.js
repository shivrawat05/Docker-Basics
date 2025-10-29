const {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3Client = require("../utils/s3Client");

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

// 1️⃣ Step 1: Start multipart upload
exports.createMultipartUpload = async (req, res) => {
  try {
    const { fileName, fileType } = req.body;

    const command = new CreateMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: `uploads/${fileName}`,
      ContentType: fileType,
    });

    const response = await s3Client.send(command);

    res.json({
      uploadId: response.UploadId,
      key: response.Key,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2️⃣ Step 2: Get presigned URLs for each part
exports.getMultipartPreSignedUrls = async (req, res) => {
  try {
    const { uploadId, key, partsCount } = req.body;

    const urls = await Promise.all(
      Array.from({ length: partsCount }, async (_, i) => {
        const command = new UploadPartCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          UploadId: uploadId,
          PartNumber: i + 1,
        });
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return { partNumber: i + 1, url };
      })
    );

    res.json({ urls });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3️⃣ Step 3: Complete multipart upload
exports.completeMultipartUpload = async (req, res) => {
  try {
    const { uploadId, key, parts } = req.body; // parts = [{ETag, PartNumber}]

    const command = new CompleteMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts,
      },
    });

    const response = await s3Client.send(command);
    res.json({ location: response.Location });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4️⃣ Optional: Abort multipart upload
exports.abortMultipartUpload = async (req, res) => {
  try {
    const { uploadId, key } = req.body;

    const command = new AbortMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
    });

    await s3Client.send(command);
    res.json({ message: "Multipart upload aborted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
