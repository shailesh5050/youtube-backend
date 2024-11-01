import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

const verifyToken = asyncHandler(async (req, res, next) => {
  try {
    console.log(req.cookies);

    // Get the access token from cookies or Authorization header
    const accessToken =
      req.cookies.accessToken ||
      req.header('Authorization')?.replace('Bearer ', '');

    if (!accessToken) {
      throw new ApiError('Unauthorized', 401);
    }

    // Verify the token
    const decodedToken = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    // Find the user in the database
    const user = await User.findById(decodedToken._id).select(
      '-password -refreshToken'
    );

    if (!user) {
      throw new ApiError('Invalid token', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(error.message || 'Unauthorized', 401);
  }
});

export default verifyToken;
