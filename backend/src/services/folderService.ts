import prisma from "../lib/prisma";

// Create a new folder (optionally inside a parent folder)
export async function createFolder(
  userId: string,
  name: string,
  parentId?: string
) {
  // If parentId is provided, make sure it belongs to this user
  if (parentId) {
    const parent = await prisma.folder.findFirst({
      where: { id: parentId, userId },
    });

    if (!parent) {
      throw new Error("Parent folder not found");
    }
  }

  const folder = await prisma.folder.create({
    data: {
      userId,
      name,
      parentId: parentId ?? null,
    },
  });

  return folder;
}

// List all folders at a given level
// parentId = null means root level folders
export async function listFolders(userId: string, parentId?: string) {
  const folders = await prisma.folder.findMany({
    where: {
      userId,
      parentId: parentId ?? null,
    },
    orderBy: { createdAt: "asc" },
  });

  return folders;
}

// Get a single folder with its files and subfolders
export async function getFolderContents(userId: string, folderId: string) {
  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId },
  });

  if (!folder) {
    throw new Error("Folder not found");
  }

  // Get all subfolders inside this folder
  const subfolders = await prisma.folder.findMany({
    where: { parentId: folderId, userId },
    orderBy: { createdAt: "asc" },
  });

  // Get all files inside this folder
  const files = await prisma.file.findMany({
    where: { folderId, userId },
    include: {
      account: { select: { googleEmail: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    folder,
    subfolders,
    files: files.map((f) => ({ ...f, size: f.size.toString() })),
  };
}

// Move a file into a folder (or to root if no folderId)
export async function moveFile(
  userId: string,
  fileId: string,
  targetFolderId?: string
) {
  // Make sure file belongs to this user
  const file = await prisma.file.findFirst({
    where: { id: fileId, userId },
  });

  if (!file) {
    throw new Error("File not found");
  }

  // If moving to a folder, make sure it belongs to this user
  if (targetFolderId) {
    const folder = await prisma.folder.findFirst({
      where: { id: targetFolderId, userId },
    });

    if (!folder) {
      throw new Error("Target folder not found");
    }
  }

  const updated = await prisma.file.update({
    where: { id: fileId },
    data: { folderId: targetFolderId ?? null },
  });

  return { ...updated, size: updated.size.toString() };
}

// Delete a folder and everything inside it recursively
export async function deleteFolder(userId: string, folderId: string) {
  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId },
  });

  if (!folder) {
    throw new Error("Folder not found");
  }

  // Recursively delete all subfolders first
  await deleteFolderRecursive(userId, folderId);

  return { message: "Folder deleted successfully" };
}

// Helper — deletes a folder, its files, and all nested subfolders
async function deleteFolderRecursive(userId: string, folderId: string) {
  // Find all subfolders
  const subfolders = await prisma.folder.findMany({
    where: { parentId: folderId, userId },
  });

  // Recursively delete each subfolder first (depth-first)
  for (const subfolder of subfolders) {
    await deleteFolderRecursive(userId, subfolder.id);
  }

  // Move files in this folder to root instead of deleting them
  // (we don't want to lose files just because a folder was deleted)
  await prisma.file.updateMany({
    where: { folderId, userId },
    data: { folderId: null },
  });

  // Now delete the folder itself
  await prisma.folder.delete({ where: { id: folderId } });
}

// Build a breadcrumb trail for a given folder
// e.g. Root > Projects > Backend > DriveStack
export async function getFolderBreadcrumb(userId: string, folderId: string) {
  const breadcrumb: { id: string; userId: string; name: string; parentId: string | null; createdAt: Date }[] = [];
  let currentId: string | null = folderId;

while (currentId) {
    const folder: { id: string; userId: string; name: string; parentId: string | null; createdAt: Date } | null = await prisma.folder.findFirst({
      where: { id: currentId, userId },
    });

    // if folder not found, stop walking up
    if (!folder) break;

    breadcrumb.unshift({
      id: folder.id,
      userId: folder.userId,
      name: folder.name,
      parentId: folder.parentId,
      createdAt: folder.createdAt,
    });

    currentId = folder.parentId;
  }

  return breadcrumb;
}