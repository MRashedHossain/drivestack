import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import session from "express-session";
import passport from "./lib/passport";
import prisma from "./lib/prisma";
import authRoutes from "./routes/auth";
import storageRoutes from "./routes/storage"

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

// Session middleware — passport needs this to store login state
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // set to true in production with HTTPS
  })
);

// Initialize passport and restore session
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/auth", authRoutes);

app.use("/storage", storageRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "DriveStack backend is running 🚀" });
});

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