const { S3 } = require("aws-sdk");
const fs = require("fs");
const path = require("path");

require('dotenv').config({path: 'D:/project/repl-main/bad-code/backend/.env.example'});

const s3 = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: process.env.S3_ENDPOINT,
});

async function fetchS3Folder(key, localPath) {
  try {
    const params = {
      Bucket: process.env.S3_BUCKET || "manlab",
      Prefix: key,
    };

    const response = await s3.listObjectsV2(params).promise();
    if (response.Contents) {
      // Use Promise.all to run getObject operations in parallel
      await Promise.all(
        response.Contents.map(async (file) => {
          const fileKey = file.Key;
          if (fileKey) {
            const getObjectParams = {
              Bucket: process.env.S3_BUCKET || "manlab",
              Key: fileKey,
            };

            const data = await s3.getObject(getObjectParams).promise();
            if (data.Body) {
              const fileData = data.Body;
              const filePath = `${localPath}/${fileKey.replace(key, "")}`;

              await writeFile(filePath, fileData);

              console.log(`Downloaded ${fileKey} to ${filePath}`);
            }
          }
        })
      );
    }
  } catch (error) {
    console.error("Error fetching folder:", error);
  }
}

async function copyS3Folder(sourcePrefix, destinationPrefix, continuationToken) {
  try {
    // List all objects in the source folder
    const listParams = {
      Bucket: process.env.S3_BUCKET || "manlab",
      Prefix: sourcePrefix,
      ContinuationToken: continuationToken,
    };

    const listedObjects = await s3.listObjectsV2(listParams).promise();

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) return;

    // Copy each object to the new location
    await Promise.all(
      listedObjects.Contents.map(async (object) => {
        if (!object.Key) return;
        let destinationKey = object.Key.replace(sourcePrefix, destinationPrefix);
        let copyParams = {
          Bucket: process.env.S3_BUCKET || "manlab",
          CopySource: `${process.env.S3_BUCKET}/${object.Key}`,
          Key: destinationKey,
        };

        console.log(copyParams);

        await s3.copyObject(copyParams).promise();
        console.log(`Copied ${object.Key} to ${destinationKey}`);
      })
    );

    // Check if the list was truncated and continue copying if necessary
    if (listedObjects.IsTruncated) {
      listParams.ContinuationToken = listedObjects.NextContinuationToken;
      await copyS3Folder(sourcePrefix, destinationPrefix, listParams.ContinuationToken);
    }
  } catch (error) {
    console.error("Error copying folder:", error);
  }
}

function writeFile(filePath, fileData) {
  return new Promise(async (resolve, reject) => {
    await createFolder(path.dirname(filePath));

    fs.writeFile(filePath, fileData, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function createFolder(dirName) {
  return new Promise((resolve, reject) => {
    fs.mkdir(dirName, { recursive: true }, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

async function saveToS3(key, filePath, content) {
  const params = {
    Bucket: process.env.S3_BUCKET || "manlab",
    Key: `${key}${filePath}`,
    Body: content,
  };

  await s3.putObject(params).promise();
}

module.exports = {
  fetchS3Folder,
  copyS3Folder,
  saveToS3,
};
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID);
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY);
