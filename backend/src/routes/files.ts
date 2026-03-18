import { Router, Request, Response } from "express";
import multer from "multer";
import {
  uploadFile,
  downloadFile,
  deleteFile,
  renameFile,
  listFiles,
} from "../services/fileService";

const router = Router();

// Store uploaded files in memory (as Buffer) instead of saving to disk
// Good for small-medium files, we'll stream them straight to Drive
const upload = multer({ storage: multer.memoryStorage() });

// Auth check middleware
function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.user) {
    res.status(401).json({ message: "Not logged in" });
    return;
  }
  next();
}

// GET /files — list all files (optionally ?folderId=xxx to filter by folder)
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const folderId = req.query.folderId as string | undefined;
    const files = await listFiles(user.id, folderId);
    res.json(files);
  } catch (err) {
    console.error("List files error:", err);
    res.status(500).json({ message: "Failed to list files" });
  }
});

// POST /files/upload — upload a file
// multer processes the multipart form data and puts file in req.file
router.post("/upload", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
  try {
    const user = req.user as any;

    if (!req.file) {
      res.status(400).json({ message: "No file provided" });
      return;
    }

    const { folderId } = req.body;

    const file = await uploadFile(
      user.id,
      req.file.originalname,
      req.file.mimetype,
      req.file.buffer,
      folderId
    );

    res.status(201).json(file);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Failed to upload file" });
  }
});

// GET /files/:id/download — download a file
router.get("/:id/download", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { stream, fileName, mimeType } = await downloadFile(req.params.id as string, user.id);

    // Set headers so browser knows it's a file download
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", mimeType);

    // Pipe the Drive stream directly to the response
    stream.pipe(res);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ message: "Failed to download file" });
  }
});

// DELETE /files/:id — delete a file
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const result = await deleteFile(req.params.id as string, user.id);
    res.json(result);
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Failed to delete file" });
  }
});

// PATCH /files/:id/rename — rename a file
router.patch("/:id/rename", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ message: "New name is required" });
      return;
    }

    const file = await renameFile(req.params.id as string, user.id, name);
    res.json(file);
  } catch (err) {
    console.error("Rename error:", err);
    res.status(500).json({ message: "Failed to rename file" });
  }
});

export default router;