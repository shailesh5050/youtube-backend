import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import User from '../models/user.model.js';
import { uploadFile } from '../utils/claudinary.js';
import ApiResponse from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

// Function to generate access and refresh tokens
async function generateTokens(userId) {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError('Token generation failed', 500);
  }
}

const registerUser = asyncHandler(async (req, res) => {
  const { fullname, username, email, password } = req.body;

  // Validate required fields
  if (!fullname || !username || !email || !password) {
    throw new ApiError('All fields are required', 400);
  }

  // Check if the user already exists
  const userExists = await User.findOne(
    { $or: [{ username }, { email }] },
    { username: 1, email: 1 }
  );
  if (userExists) {
    throw new ApiError('Username or Email already exists', 400);
  }

  // Handle avatar and cover image upload
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError('Avatar is required', 400);
  }

  try {
    var avatarUrl = await uploadFile(avatarLocalPath);
    var coverImageUrl = coverImageLocalPath
      ? await uploadFile(coverImageLocalPath)
      : '';
  } catch (error) {
    console.error(error);
    throw new ApiError('Avatar upload failed', 400);
  }

  if (!avatarUrl) {
    throw new ApiError('Avatar upload failed', 400);
  }

  // Create user
  const user = await User.create({
    fullname,
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

  res
    .status(201)
    .json(new ApiResponse(201, createdUser, 'User registered successfully'));
});

// Login user
const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!email || !password) {
    throw new ApiError('All fields are required', 400);
  }

  // Check for user in database
  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user || !(await user.checkPassword(password))) {
    throw new ApiError('Invalid username or password', 400);
  }

  const { accessToken, refreshToken } = await generateTokens(user._id);

  const loggedInUser = await User.findById(user._id).select(
    '-password -refreshToken'
  );

  res
    .status(200)
    .cookie('accessToken', accessToken, {
      httpOnly: true,
      maxAge: 10 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
    })
    .cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: 10 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
    })
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        'Login successful'
      )
    );
});

// Logout user
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: '' } },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };

  res.clearCookie('accessToken', options);
  res.clearCookie('refreshToken', options);
  res.status(200).json(new ApiResponse(200, {}, 'Logout successful'));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies || req.body;
  if (!refreshToken) {
    throw new ApiError('Refresh token is required', 400);
  }
  try {
    const decodedToken = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new ApiError('Invalid refresh token', 400);
    }
    if (user.refreshToken !== refreshToken) {
      throw new ApiError('refresh toke is expired or used', 400);
    }
    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshedToken } = await generateTokens(user._id);
    await generateTokens(user._id);
    return res
      .status(200)
      .cookie('accessToke', accessToken, options)
      .cookie('refreshToken', refreshedToken, options);
  } catch (error) {
    throw new ApiError(error.message, 400);
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
