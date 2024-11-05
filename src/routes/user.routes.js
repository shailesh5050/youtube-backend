import { Router } from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPassword,
  getUserChannelProfile,
  getUserHistory,
  updateUserAvatar,
  updateUserCoverImage,
  subscribeToChannel,
} from '../controllers/user.controller.js';

import { upload } from '../middleware/multer.middleware.js';
import verifyToken from '../middleware/auth.middleware.js';
const router = Router();

router.route('/register').post(
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'avatar', maxCount: 1 },
  ]),
  registerUser
);
router.route('/login').post(loginUser);

//secured Routes
router.route('/logout').post(verifyToken, logoutUser);
router.route('/refresh-token').post(refreshAccessToken);
router.route('/change-password').post(verifyToken, changeCurrentPassword);
router.route('/current-user').get(verifyToken, getCurrentUser);
router
  .route('/avatar')
  .patch(verifyToken, upload.single('avatar'), updateUserAvatar);
router
  .route('/cover-image')
  .patch(verifyToken, upload.single('coverImage'), updateUserCoverImage);
router.route('/c/:username').get(verifyToken, getUserChannelProfile);
router.route('/history').get(verifyToken, getUserHistory);

export default router;
