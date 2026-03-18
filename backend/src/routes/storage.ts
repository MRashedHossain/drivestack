import { Router, Request, Response } from "express";
import { getAggregatedStorage } from "../services/storageService";

const router = Router();

// Middleware to protect routes — user must be logged in
function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.user) {
    res.status(401).json({ message: "Not logged in" });
    return;
  }
  next();
}

// GET /storage/overview — returns total/used/free across all connected accounts
router.get("/overview", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const storage = await getAggregatedStorage(user.id);
    res.json(storage);
  } catch (err) {
    console.error("Storage overview error:", err);
    res.status(500).json({ message: "Failed to fetch storage info" });
  }
});

export default router;