import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./lib/prisma";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

app.get("/health", (req, res) => {
  res.json({ status: "DriveStack backend is running 🚀" });
});

// Test DB connection when server starts
async function main() {
  await prisma.$connect();
  console.log("✅ Database connected");

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("❌ Failed to connect to database:", err);
  process.exit(1);
});