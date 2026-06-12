import "./instrument"; // must be first — initialises Sentry before any other module
import * as Sentry from "@sentry/node";
import path from "path";
import { existsSync } from "fs";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { Prisma } from "@prisma/client";
import { auth } from "./lib/auth";
import boss from "./lib/boss";
import dashboardRouter from "./routes/dashboard";
import ticketsRouter from "./routes/tickets";
import usersRouter from "./routes/users";
import inboundEmailRouter from "./routes/inbound-email";
import {
  CLASSIFY_TICKET_QUEUE,
  classifyTicketWorker,
} from "./workers/classifyTicket";
import {
  AUTO_RESOLVE_QUEUE,
  autoResolveWorker,
} from "./workers/autoResolveTicket";

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: use the same CLIENT_URL env var that Better Auth trustedOrigins uses.
// Never hardcode a port here — a mismatch silently trusts the wrong origin.
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

// Rate-limit sign-in attempts in production only — keep dev/test unrestricted.
if (process.env.NODE_ENV === "production") {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts, please try again later" },
  });
  app.use("/api/auth/sign-in", authLimiter);
}

// Better Auth handler must come before express.json()
app.all("/api/auth/*path", toNodeHandler(auth));

app.use(express.json());

app.use("/api/inbound-email", inboundEmailRouter);

app.use("/api/dashboard", dashboardRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/users", usersRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/debug-sentry", (_req, res) => {
  throw new Error("something failed");
});

// In production, serve the built React client and handle SPA routing
if (process.env.NODE_ENV === "production") {
  const clientDist = path.join(process.cwd(), "client/dist");
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    // Express 5 named wildcard — catches all non-API routes for client-side routing
    app.get("*path", (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }
}

// Sentry error handler — must come after all routes and before the custom error handler
Sentry.setupExpressErrorHandler(app);

// Global error handler — catches all errors forwarded via next(err).
// Maps known Prisma error codes to clean HTTP responses so stack traces
// and query context never reach the client.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Resource not found" });
      return;
    }
    if (err.code === "P2003") {
      res
        .status(400)
        .json({ error: "Invalid reference: related record does not exist" });
      return;
    }
    if (err.code === "P2002") {
      res
        .status(409)
        .json({ error: "A record with that value already exists" });
      return;
    }
  }
  // Capture unexpected errors in Sentry and log locally
  Sentry.captureException(err);
  console.error("[unhandled error]", err);
  res.status(500).json({ error: "Internal server error" });
});

async function startServer() {
  await boss.start();
  await boss.createQueue(CLASSIFY_TICKET_QUEUE);
  await boss.createQueue(AUTO_RESOLVE_QUEUE);
  await boss.work(CLASSIFY_TICKET_QUEUE, classifyTicketWorker);
  await boss.work(AUTO_RESOLVE_QUEUE, autoResolveWorker);
  console.log(
    "[pg-boss] workers registered: classify-ticket, auto-resolve-ticket",
  );

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
