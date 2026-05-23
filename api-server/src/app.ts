import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import { existsSync } from "fs";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

const uploadsDir = path.resolve(process.cwd(), "uploads");
app.use("/api/uploads", express.static(uploadsDir));

app.use(cors({
  origin: [
    "http://localhost:5173",
    /\.vercel\.app$/,
    /\.onrender\.com$/,
    /\.koyeb\.app$/,
  ],
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Frontend static files serve করবে (Koyeb single-service deploy এর জন্য)
const frontendDist = path.resolve(process.cwd(), "../red-x-tube/dist/public");
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
  logger.info({ frontendDist }, "Serving frontend static files");
}

export default app;
