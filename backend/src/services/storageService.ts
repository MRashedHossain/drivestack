import prisma from "../lib/prisma";
import { getStorageQuota } from "./driveService";

// Fetch storage info for every connected account and combine them
export async function getAggregatedStorage(userId: string) {
  // Get all Google accounts linked to this user
  const accounts = await prisma.connectedAccount.findMany({
    where: { userId },
  });

  if (accounts.length === 0) {
    return {
      totalStorage: 0,
      usedStorage: 0,
      freeStorage: 0,
      accounts: [],
    };
  }

  // Fetch quota for each account in parallel (much faster than one by one)
  const accountStorages = await Promise.all(
    accounts.map(async (account) => {
      try {
        const quota = await getStorageQuota(account.accessToken, account.refreshToken);
        return {
          id: account.id,
          googleEmail: account.googleEmail,
          ...quota,
        };
      } catch (err) {
        // If one account fails (e.g. token expired), don't crash everything
        console.error(`Failed to fetch quota for ${account.googleEmail}:`, err);
        return {
          id: account.id,
          googleEmail: account.googleEmail,
          total: 0,
          used: 0,
          free: 0,
          error: true,
        };
      }
    })
  );

  // Add up all accounts into one total
  const totalStorage = accountStorages.reduce((sum, a) => sum + a.total, 0);
  const usedStorage = accountStorages.reduce((sum, a) => sum + a.used, 0);
  const freeStorage = accountStorages.reduce((sum, a) => sum + a.free, 0);

  return {
    totalStorage,
    usedStorage,
    freeStorage,
    accounts: accountStorages,
  };
}

// Pick the best account to upload a file to
// Strategy: choose the account with the most free space that can fit the file
export async function getBestAccountForUpload(userId: string, fileSizeInBytes: number) {
  const accounts = await prisma.connectedAccount.findMany({
    where: { userId },
  });

  if (accounts.length === 0) {
    throw new Error("No connected accounts found");
  }

  const accountStorages = await Promise.all(
    accounts.map(async (account) => {
      try {
        const quota = await getStorageQuota(account.accessToken, account.refreshToken);
        return { account, free: quota.free };
      } catch {
        return { account, free: 0 };
      }
    })
  );

  accountStorages.sort((a, b) => b.free - a.free);
  const best = accountStorages[0];

  // Check if the best account has enough space for this specific file
  if (best.free === 0 || best.free < fileSizeInBytes) {
    throw new Error(
      `Not enough storage on any single account. Need ${fileSizeInBytes} bytes but best account only has ${best.free} bytes free. Try linking more Google accounts.`
    );
  }

  return best.account;
}