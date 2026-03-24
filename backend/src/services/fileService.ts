import { google } from "googleapis";
import { Readable } from "stream";
import { getOAuthClient, getOrCreateDriveStackFolder } from "./driveService";
import prisma from "../lib/prisma";
import { getBestAccountForUpload } from "./storageService";

export async function uploadFile(
  userId: string,
  fileName: string,
  mimeType: string,
  fileBuffer: Buffer,
  folderId?: string,
  preferredAccountId?: string  // new optional param
) {
  // Use preferred account if provided, otherwise auto-select
  let account;

  if (preferredAccountId) {
    // Verify this account belongs to this user
    account = await prisma.connectedAccount.findFirst({
      where: { id: preferredAccountId, userId },
    });
    if (!account) throw new Error("Selected account not found");
  } else {
    // Auto-select account with most free space that fits the file
    account = await getBestAccountForUpload(userId, fileBuffer.length);
  }

  // Get or create the DriveStack folder in this account's Drive
  const driveStackFolderId = await getOrCreateDriveStackFolder(
    account.accessToken,
    account.refreshToken,
    account.id
  );

  const auth = getOAuthClient(account.accessToken, account.refreshToken, account.id);
  const drive = google.drive({ version: "v3", auth });

  const fileStream = Readable.from(fileBuffer);

  // Upload into the DriveStack folder
  const driveResponse = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: mimeType,
      parents: [driveStackFolderId],  // put inside DriveStack folder
    },
    media: {
      mimeType: mimeType,
      body: fileStream,
    },
    fields: "id, name, size, mimeType",
  });

  const driveFile = driveResponse.data;

  const file = await prisma.file.create({
    data: {
      userId,
      accountId: account.id,
      driveFileId: driveFile.id!,
      name: fileName,
      size: BigInt(driveFile.size ?? 0),
      mimeType: mimeType,
      folderId: folderId ?? null,
    },
  });

  return { ...file, size: file.size.toString() };
}

// Download a file — find which account has it and stream it back
export async function downloadFile(fileId: string, userId: string) {
  // Look up file in our DB first
  const file = await prisma.file.findFirst({
    where: { id: fileId, userId },
    include: { account: true },
  });

  if (!file) {
    throw new Error("File not found");
  }

  const auth = getOAuthClient(file.account.accessToken, file.account.refreshToken, file.account.id);
  const drive = google.drive({ version: "v3", auth });

  // Get the file as a stream from Google Drive
  const driveResponse = await drive.files.get(
    { fileId: file.driveFileId, alt: "media" },
    { responseType: "stream" }
  );

  return {
    stream: driveResponse.data,
    fileName: file.name,
    mimeType: file.mimeType,
  };
}

// Delete a file from Drive and our DB
export async function deleteFile(fileId: string, userId: string) {
  const file = await prisma.file.findFirst({
    where: { id: fileId, userId },
    include: { account: true },
  });

  if (!file) {
    throw new Error("File not found");
  }

  const auth = getOAuthClient(file.account.accessToken, file.account.refreshToken, file.account.id);
  const drive = google.drive({ version: "v3", auth });

  // Delete from Google Drive
  await drive.files.delete({ fileId: file.driveFileId });

  // Delete from our DB
  await prisma.file.delete({ where: { id: fileId } });

  return { message: "File deleted successfully" };
}

// Rename a file in Drive and our DB
export async function renameFile(fileId: string, userId: string, newName: string) {
  const file = await prisma.file.findFirst({
    where: { id: fileId, userId },
    include: { account: true },
  });

  if (!file) {
    throw new Error("File not found");
  }

 const auth = getOAuthClient(file.account.accessToken, file.account.refreshToken, file.account.id);
  const drive = google.drive({ version: "v3", auth });

  // Update name in Google Drive
  await drive.files.update({
    fileId: file.driveFileId,
    requestBody: { name: newName },
  });

  // Update name in our DB
  const updated = await prisma.file.update({
    where: { id: fileId },
    data: { name: newName },
  });

  return { ...updated, size: updated.size.toString() };
}

// List all files for a user (optionally filtered by folder)
    export async function listFiles(userId: string, folderId?: string, all?: boolean) {
    const files = await prisma.file.findMany({
        where: {
        userId,
        // if all=true, skip folder filter entirely
        ...(all ? {} : { folderId: folderId ?? null }),
        },
        include: {
        account: { select: { googleEmail: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return files.map((f) => ({ ...f, size: f.size.toString() }));
}