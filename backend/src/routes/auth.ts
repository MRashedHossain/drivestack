import { Router, Request, Response } from "express";
import passport from "../lib/passport";

const router = Router();

// Reusable auth check middleware
function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.user) {
    res.status(401).json({ message: "Not logged in" });
    return;
  }
  next();
}

// Step 1: Redirect user to Google login page
// We request drive access + basic profile info
router.get(
  "/google",
  passport.authenticate("google", {
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/drive",
    ],
    accessType: "offline",  // needed to get a refresh token
    prompt: "consent",      // force consent screen so we always get refresh token
  } as any)
);

// Step 2: Google redirects back here after login
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/failed" }),
  (req: Request, res: Response) => {
    // Login successful — redirect to frontend dashboard
    res.redirect("http://localhost:5173/dashboard");
  }
);

// Return current logged in user info
router.get("/me", (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Not logged in" });
    return;
  }
  res.json(req.user);
});

// Logout
router.get("/logout", (req: Request, res: Response) => {
  req.logout(() => {
    res.json({ message: "Logged out successfully" });
  });
});

router.get("/failed", (req: Request, res: Response) => {
  res.status(401).json({ message: "Google login failed" });
});

// Link an additional Google account to the already logged in user
// Different from normal login — we pass the existing user id via session state
router.get("/google/link", requireAuth, (req: Request, res: Response, next: Function) => {
  // Store current user id so we know who to link to after OAuth completes
  (req.session as any).linkingUserId = (req.user as any).id;

  passport.authenticate("google", {
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/drive",
    ],
    accessType: "offline",
    prompt: "consent",
  } as any)(req, res, next);
});

export default router;