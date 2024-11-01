import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLAUDINARY_NAME,
  api_key: process.env.CLAUDINARY_API_KEY,
  api_secret: process.env.CLAUDINARY_API_SECRET,
});

const uploadFile = async file => {
  try {
    if (!file) {
      return;
    }
    const result = await cloudinary.uploader.upload(file, {
      resource_type: 'auto',
    });
    //successfully upload
    console.log(result);
    return result.url;
  } catch (error) {
    //unlink local file
    fs.unlinkSync(file);

    console.log(error);
  }
};

export { uploadFile };
