import { FastifyReply, RouteHandlerMethod } from "fastify";
import { Http2SecureServer } from "http2";
import fs, { Stats } from "node:fs";
import path from "node:path";
import url from "node:url";
import { env } from "../env.js";

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

const yearInSeconds = 31536000;
const yearInMilliseconds = yearInSeconds * 1000;

// The following isn't really elegant, but `fastify-static` doesn't provide any
// compelling way to manage the fallback index.html when routing using the
// request host.
const handleRequest = async (
  reqPath: string,
  appName: string,
  reply: FastifyReply<Http2SecureServer>,
) => {
  if (reqPath.startsWith("assets/") || reqPath.includes(".manager.bundle.js")) {
    void reply.header("cache-control", `public, max-age=${yearInSeconds}, immutable`);
    const date = new Date();
    date.setTime(date.getTime() + yearInMilliseconds);
    void reply.header("expires", date.toUTCString());
    return reply.sendFile(reqPath, path.join(dirname, "../../dist", appName));
  } else {
    const handleRequest = async (err: NodeJS.ErrnoException | null, stat: Stats) => {
      if (err == null && stat.isFile()) {
        return reply.sendFile(reqPath, path.join(dirname, "../../dist", appName));
      } else {
        // Prevents having old HTMLs in cache referencing assets that
        // do not longer exist in its files
        void reply.header("cache-control", `public, max-age=0`);
        return reply.sendFile("/index.html", path.join(dirname, "../../dist", appName));
      }
    };

    fs.stat(
      path.join(dirname, "../../dist", appName, reqPath),
      (err, stat) => void handleRequest(err, stat),
    );
  }
};

export function getProductionRequestHandler() {
  const BANKING_HOST = new URL(env.BANKING_URL).hostname;
  const ONBOARDING_HOST = new URL(env.ONBOARDING_URL).hostname;

  const handler: RouteHandlerMethod<Http2SecureServer> = (request, reply) => {
    const host = new URL(`${request.protocol}://${request.hostname}`).hostname;
    const params = request.params as Record<string, string>;

    const reqPath = params["*"] ?? "index.html";
    if (reqPath.includes("..")) {
      return reply.code(404).send("404");
    }
    switch (host) {
      case BANKING_HOST:
        void handleRequest(reqPath, "banking", reply);
        break;
      case ONBOARDING_HOST:
        void handleRequest(reqPath, "onboarding", reply);
        break;
      default:
        return reply.code(404).send("404");
    }
  };

  return handler;
}
