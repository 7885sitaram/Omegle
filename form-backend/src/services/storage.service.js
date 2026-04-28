const ImageKit = require("@imagekit/nodejs");

const client = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

async function UploadFile(buffer, fileName = "feed-item.jpg") {
  console.log("DEBUG: UploadFile called. FileName:", fileName, "Size:", buffer.length);

  try {
    const fileBase64 = buffer.toString("base64");

    console.log("DEBUG: Calling ImageKit files.upload...");
    const response = await client.files.upload({
      file: fileBase64,
      fileName: fileName,
    });

    console.log("DEBUG: ImageKit upload success. URL:", response.url);
    return response.url;
  } catch (err) {
    console.error("DEBUG: ImageKit Upload Error:", err);
    throw err;
  }
}

module.exports = { UploadFile };