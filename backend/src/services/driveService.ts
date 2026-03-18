import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

// Build an authenticated Google OAuth2 client for a specific connected account
export function getOAuthClient(accessToken: string, refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_CALLBACK_URL!
  );

  // Inject the stored tokens so we can make API calls on behalf of this account
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

// Fetch storage quota for a single Google account
// Returns how much total/used/free space this account has (in bytes)
export async function getStorageQuota(accessToken: string, refreshToken: string) {
  const auth = getOAuthClient(accessToken, refreshToken);
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.about.get({
    fields: "storageQuota",
  });

  const quota = res.data.storageQuota!;

  const total = Number(quota.limit ?? 0);
  const used = Number(quota.usage ?? 0);
  const free = total - used;

  return { total, used, free };
}