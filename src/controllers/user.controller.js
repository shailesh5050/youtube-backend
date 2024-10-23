import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import User from '../models/user.model.js';
import { uploadFile } from '../utils/claudinary.js';
import ApiResponse from '../utils/ApiResponse.js';
const registerUser = asyncHandler(async (req, res) => {
  //get user details from req
  const { fullName, username, email, password } = req.body;

  //validation for empty
  if (!fullName || !username || !email || !password) {
    throw new ApiError('All fields are required', 400);
  }

  //check if user exist
  const userExists = await User.findOne(
    {
      $or: [{ username }, { email }],
    },
    { username: 1, email: 1 }
  );
  if (userExists) {
    throw new ApiError('Username or Email already exists', 400);
  }
  const avatarLocalPath = req.files?.avatar[0].path;
  const coverImageLocalPath = req.files?.coverImage[0].path;
  //avatar validation
  if (!avatar) {
    throw new ApiError('Avatar is required', 400);
  }

  //upload to claudinary
  const avatarUrl = await uploadFile(avatarLocalPath);
  const coverImageUrl = await uploadFile(coverImageLocalPath);
  //avatarUrl validation
  if (!avatarUrl) {
    throw new ApiError('Avatar upload failed', 400);
  }

  //create user
  const user = await User.create({
    fullName,
    username,
    email,
    password,
    avatar: avatarUrl,
    coverImage: coverImageUrl || '',
  });

  const createdUser = await User.findById(user._id).select(
    '-password -refreshToken'
  );
  if (!createdUser) {
    throw new ApiError('User creation failed', 400);
  }
  //send response
  res
    .status(201)
    .json(new ApiResponse(201, createdUser, 'User registered successfully'));
});

export { registerUser };
