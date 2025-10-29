import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "ap-south-1" });

async function test() {
  try {
    const data = await s3.send(new ListBucketsCommand({}));
    console.log("Buckets:", data.Buckets);
  } catch (err) {
    console.error("AWS Error:", err);
  }
}

test();
