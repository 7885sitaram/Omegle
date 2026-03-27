const ImageKit = require("@imagekit/nodejs");

async function UploadFile(buffer, fileName = "feed-item.jpg") {
  const ImageKit = require("@imagekit/nodejs");
  const client = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });

  console.log("ImageKit Uploading:", fileName, "Size:", buffer.length);

  try {
    const response = await client.upload({
      file: buffer,
      fileName: fileName,
    });
    console.log("ImageKit Upload Success:", response.url);
    return response.url;
  } catch (err) {
    console.error("ImageKit Upload Error DETAILS:", err);
    throw err;
  }
}

module.exports = { UploadFile };