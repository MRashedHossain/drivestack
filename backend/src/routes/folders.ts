import { Router, Request, Response } from "express";
import {
  createFolder,
  listFolders,
  getFolderContents,
  moveFile,
  deleteFolder,
  getFolderBreadcrumb,
} from "../services/folderService";

const router = Router();

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.user) {
    res.status(401).json({ message: "Not logged in" });
    return;
  }
  next();
}

// GET /folders — list root folders (or ?parentId=xxx for subfolders)
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const parentId = req.query.parentId as string | undefined;
    const folders = await listFolders(user.id, parentId);
    res.json(folders);
  } catch (err) {
    console.error("List folders error:", err);
    res.status(500).json({ message: "Failed to list folders" });
  }
});

// POST /folders — create a new folder
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { name, parentId } = req.body;

    if (!name) {
      res.status(400).json({ message: "Folder name is required" });
      return;
    }

    const folder = await createFolder(user.id, name, parentId);
    res.status(201).json(folder);
  } catch (err) {
    console.error("Create folder error:", err);
    res.status(500).json({ message: "Failed to create folder" });
  }
});

// GET /folders/:id — get folder contents (subfolders + files)
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const contents = await getFolderContents(user.id, req.params.id as string);
    res.json(contents);
  } catch (err) {
    console.error("Get folder error:", err);
    res.status(500).json({ message: "Failed to get folder contents" });
  }
});

// GET /folders/:id/breadcrumb — get breadcrumb trail
router.get("/:id/breadcrumb", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const breadcrumb = await getFolderBreadcrumb(user.id, req.params.id as string);
    res.json(breadcrumb);
  } catch (err) {
    console.error("Breadcrumb error:", err);
    res.status(500).json({ message: "Failed to get breadcrumb" });
  }
});

// PATCH /folders/:id/move-file — move a file into this folder
router.patch("/:id/move-file", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { fileId } = req.body;

    if (!fileId) {
      res.status(400).json({ message: "fileId is required" });
      return;
    }

    // req.params.id = "root" means move to root level
    const targetFolderId = req.params.id === "root" ? undefined : req.params.id;
    const file = await moveFile(user.id, fileId, targetFolderId as string);
    res.json(file);
  } catch (err) {
    console.error("Move file error:", err);
    res.status(500).json({ message: "Failed to move file" });
  }
});

// DELETE /folders/:id — delete a folder
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const result = await deleteFolder(user.id, req.params.id as string);
    res.json(result);
  } catch (err) {
    console.error("Delete folder error:", err);
    res.status(500).json({ message: "Failed to delete folder" });
  }
});

export default router;