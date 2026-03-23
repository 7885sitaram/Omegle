const ImageKit = require("@imagekit/nodejs");

const client = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

async function UploadFile(buffer, fileName = "profile-picture.jpg") {
  const { toFile } = require("@imagekit/nodejs");

  const file = await toFile(buffer, fileName);

  const response = await client.files.upload({
    file,
    fileName,
  });

  return response.url;
}

module.exports = { UploadFile };