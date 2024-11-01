import { Router } from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
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

export default router;
