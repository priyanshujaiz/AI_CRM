import { Router } from "express";
import { authController } from "../controllers/authController.js";

const router = Router();

// POST /api/auth/signup — create an account, returns { token, user }
router.post("/signup", authController.signup);

// POST /api/auth/login — exchange credentials for a token, returns { token, user }
router.post("/login", authController.login);

export default router;