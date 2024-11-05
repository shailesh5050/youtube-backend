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

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  //validation
  if (!oldPassword || !newPassword) {
    throw new ApiError('All fields are required', 400);
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError('User not found', 404);
  }
  const isMatch = await user.checkPassword(oldPassword);
  if (!isMatch) {
    throw new ApiError('Invalid old password', 400);
  }
  user.password = newPassword;
  await user.save();
  res
    .status(200)
    .json(new ApiResponse(200, {}, 'Password changed successfully'));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    '-password -refreshToken'
  );
  if (!user) {
    throw new ApiError('User not found', 404);
  }
  res.status(200).json(new ApiResponse(200, user, 'User fetched successfully'));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  // Validation for required fields
  if (!fullname || !email) {
    throw new ApiError('All fields are required', 400);
  }

  // Check if the email is already taken by another user
  const existingUser = await User.findOne({
    email,
    _id: { $ne: req.user._id },
  });
  if (existingUser) {
    throw new ApiError('Email is already in use by another account', 400);
  }

  // Update user details
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true }
  ).select('-password -refreshToken');

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  res
    .status(200)
    .json(new ApiResponse(200, user, 'Account details updated successfully'));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const localPath = req.file?.path;
  if (!localPath) {
    throw new ApiError('Avatar is required', 400);
  }
  try {
    const avatarUrl = await uploadFile(localPath);
    if (!avatarUrl) {
      throw new ApiError('Avatar upload failed', 400);
    }

    const user = User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          avatar: avatarUrl,
        },
      },
      { new: true }
    ).select('-password -refreshToken');
  } catch (err) {
    throw new ApiError('Avatar upload failed', 400);
  }
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const localPath = req.file?.path;
  if (!localPath) {
    throw new ApiError('coverImage is required', 400);
  }
  try {
    const coverImageUrl = await uploadFile(localPath);
    if (!coverImageUrl) {
      throw new ApiError('coverImage upload failed', 400);
    }

    const user = User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          coverImage: coverImageUrl,
        },
      },
      { new: true }
    ).select('-password -refreshToken');
  } catch (err) {
    throw new ApiError('coverImage upload failed', 400);
  }
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  // Input validation
  if (!username?.trim()) {
    throw new ApiError(400, 'Username is required');
  }

  // Ensure authenticated user exists
  if (!req.user?._id) {
    throw new ApiError(401, 'Authentication required');
  }

  const channel = await User.aggregate([
    {
      // Match the requested username
      $match: {
        username: username.toLowerCase(), // Case insensitive matching
      },
    },
    {
      // Lookup subscribers of this channel
      $lookup: {
        from: 'subscriptions',
        localField: '_id',
        foreignField: 'channel',
        as: 'subscribers',
      },
    },
    {
      // Lookup channels this user subscribes to
      $lookup: {
        from: 'subscriptions',
        localField: '_id',
        foreignField: 'subscriber',
        as: 'subscribeTo',
      },
    },
    {
      // Add computed fields
      $addFields: {
        subscriberCount: {
          $size: '$subscribers',
        },
        subscriptionCount: {
          $size: '$subscribeTo',
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user._id, '$subscribers.subscriber'],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      // Select fields to return
      $project: {
        fullname: 1,
        username: 1,
        subscriberCount: 1,
        subscriptionCount: 1,
        isSubscribed: 1,
        avatar: 1,
        createdAt: 1,
      },
    },
  ]).catch(error => {
    throw new ApiError(500, 'Database operation failed');
  });

  // Check if channel exists
  if (!channel || channel.length === 0) {
    throw new ApiError(404, 'Channel not found');
  }

  // Send API response
  res.status(200).json(new ApiResponse(200, channel[0], 'Channel fetched'));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: 'videos',
        localField: 'watchHistory',
        foreignField: '_id',
        as: 'watchHistory',
        pipeline: [
          {
            $lookup: {
              from: 'users',
              localField: 'owner',
              foreignField: '_id',
              as: 'owner',
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: '$owner',
              },
            },
          },
        ],
      },
    },
  ]);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        'Watch history fetched successfully'
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
};
