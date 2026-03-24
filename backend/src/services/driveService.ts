import { google } from "googleapis";
import dotenv from "dotenv";
import prisma from "../lib/prisma";
dotenv.config();

export function getOAuthClient(
  accessToken: string,
  refreshToken: string,
  accountId?: string  // pass accountId so we can update the token in DB
) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_CALLBACK_URL!
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // When Google auto-refreshes the token, save the new one to DB
  // so the next API call uses the fresh token
  if (accountId) {
    oauth2Client.on("tokens", async (tokens) => {
      if (tokens.access_token) {
        await prisma.connectedAccount.update({
          where: { id: accountId },
          data: { accessToken: tokens.access_token },
        });
        console.log(`✅ Token refreshed for account ${accountId}`);
      }
    });
  }

  return oauth2Client;
}

export async function getStorageQuota(
  accessToken: string,
  refreshToken: string,
  accountId?: string
) {
  const auth = getOAuthClient(accessToken, refreshToken, accountId);
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.about.get({ fields: "storageQuota" });
  const quota = res.data.storageQuota!;

  const total = Number(quota.limit ?? 0);
  const used = Number(quota.usage ?? 0);
  const free = total - used;

  return { total, used, free };
}

// Find or create a "DriveStack" folder in the given Google Drive account
// This keeps our files organized and separate from the user's own Drive files
export async function getOrCreateDriveStackFolder(
  accessToken: string,
  refreshToken: string,
  accountId?: string
): Promise<string> {
  const auth = getOAuthClient(accessToken, refreshToken, accountId);
  const drive = google.drive({ version: "v3", auth });

  // Search for existing DriveStack folder
  const searchRes = await drive.files.list({
    q: "name='DriveStack' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: "files(id, name)",
  });

  const existing = searchRes.data.files?.[0];

  // If it already exists return its id
  if (existing?.id) {
    return existing.id;
  }

  // Otherwise create it
  const createRes = await drive.files.create({
    requestBody: {
      name: "DriveStack",
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  return createRes.data.id!;
}