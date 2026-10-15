import http from "node:http";
import { readFile, stat, mkdir, chmod } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { createClub } from "./club.mjs";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
if (existsSync(path.join(root, ".env")))
  process.loadEnvFile(path.join(root, ".env"));
const dev = process.argv.includes("--dev");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4173);
await mkdir(path.join(root, "data"), { recursive: true, mode: 0o700 });
const generated = !process.env.STAFF_PASSWORD;
const password =
  process.env.STAFF_PASSWORD || randomBytes(12).toString("base64url");
const database = path.join(root, "data/club.sqlite");
const club = createClub({
  database,
  password,
  publicUrl: process.env.PUBLIC_URL || "",
  secureCookie: process.env.COOKIE_SECURE === "1",
});
await chmod(database, 0o600);
const vite = dev
  ? await (
      await import("vite")
    ).createServer({
      configFile: path.join(root, "vite.config.js"),
      server: { middlewareMode: true },
      appType: "custom",
    })
  : null;
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};
async function sendFile(res, file) {
  try {
    if (!(await stat(file)).isFile()) return false;
    res.setHeader(
      "Content-Type",
      types[path.extname(file)] || "application/octet-stream",
    );
    res.end(await readFile(file));
    return true;
  } catch {
    return false;
  }
}
const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
  try {
    if (await club.handler(req, res)) return;
    const url = new URL(req.url, "http://localhost");
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === "/club") {
      res.writeHead(302, { Location: "/club/" });
      res.end();
      return;
    }
    if (dev && (pathname.startsWith("/club/") || pathname.startsWith("/@"))) {
      vite.middlewares(req, res, async () => {
        if (!res.writableEnded) {
          if (!["/club/", "/club/staff", "/club/poster"].includes(pathname)) {
            res.writeHead(404);
            res.end("Not found");
            return;
          }
          try {
            res.setHeader("Content-Type", "text/html");
            res.end(
              await vite.transformIndexHtml(
                req.url,
                await readFile(path.join(root, "loyalty/index.html"), "utf8"),
              ),
            );
          } catch {
            res.writeHead(500);
            res.end("Unable to load the club.");
          }
        }
      });
      return;
    }
    if (!dev && pathname.startsWith("/club/")) {
      if (["/club/", "/club/staff", "/club/poster"].includes(pathname)) {
        if (await sendFile(res, path.join(root, "dist/club/index.html")))
          return;
      } else if (
        /^\/club\/assets\/[\w.-]+$/.test(pathname) &&
        (await sendFile(res, path.join(root, "dist", pathname)))
      )
        return;
    }
    // Only the original public website is exposed. Never serve the database, source, or environment files.
    const originalPage = [
      "/",
      "/index.html",
      "/menu.html",
      "/signup.html",
      "/signin.html",
      "/commingsoon.html",
    ].includes(pathname);
    const asset =
      /^\/(Images|css|javaScript)\/[\w/.-]+$/.test(pathname) &&
      !pathname.split("/").includes("..");
    if (
      (originalPage || asset) &&
      (await sendFile(
        res,
        path.join(root, pathname === "/" ? "index.html" : pathname),
      ))
    )
      return;
    res.writeHead(404);
    res.end("Not found");
  } catch {
    if (!res.headersSent) res.writeHead(500);
    res.end("Unable to load this page.");
  }
});
server.listen(port, host, () => {
  console.log(
    `SpiceLife Club: http://localhost:${port}/club/\nStaff desk: http://localhost:${port}/club/staff`,
  );
  if (generated) console.log(`Temporary staff password: ${password}`);
  console.log("Local pilot: use test details. No emails or texts are sent.");
});
async function shutdown() {
  server.close();
  await vite?.close();
  club.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
