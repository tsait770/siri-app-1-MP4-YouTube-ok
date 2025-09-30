import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

// app will be mounted at /api
const app = new Hono();

// Enable CORS for all routes
app.use("*", cors());

// Mount tRPC router at /trpc
app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  })
);

// Simple health check endpoint
app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

// Export full test matrix CSV (devices x languages x commands)
app.get("/export/matrix.csv", (c) => {
  type MatrixRow = {
    suite: string;
    itemType: "device" | "browser";
    name: string;
    os: string;
    osVersion: string;
    browser: string;
    browserVersion: string;
    language: string;
    commandId: string;
    videoUrl: string;
    testId: string;
  };

  const videoUrl = "https://youtu.be/WBzofAAt32U?si=m3-zcJl6MOp7w9cc";

  const devices: Array<{
    itemType: "device" | "browser";
    name: string;
    os: string;
    osVersion: string;
    browser?: string;
    browserVersion?: string;
  }> = [
    // iOS
    { itemType: "device", name: "iPhone 17 Pro", os: "iOS", osVersion: "18" },
    { itemType: "device", name: "iPhone 17", os: "iOS", osVersion: "18" },
    { itemType: "device", name: "iPhone 16 Pro", os: "iOS", osVersion: "17" },
    { itemType: "device", name: "iPhone 15", os: "iOS", osVersion: "17" },
    { itemType: "device", name: "iPhone SE (3rd Gen)", os: "iOS", osVersion: "17" },
    // Android phones
    { itemType: "device", name: "Samsung Galaxy S24 Ultra", os: "Android", osVersion: "14" },
    { itemType: "device", name: "Samsung Galaxy S23", os: "Android", osVersion: "14" },
    { itemType: "device", name: "Google Pixel 9", os: "Android", osVersion: "15" },
    { itemType: "device", name: "Google Pixel 8", os: "Android", osVersion: "14" },
    { itemType: "device", name: "OnePlus 12", os: "Android", osVersion: "14" },
    { itemType: "device", name: "Xiaomi 14", os: "Android", osVersion: "14" },
    // Tablets
    { itemType: "device", name: "iPad Pro 12.9\"", os: "iPadOS", osVersion: "18" },
    { itemType: "device", name: "iPad Air (M2)", os: "iPadOS", osVersion: "17" },
    { itemType: "device", name: "Samsung Galaxy Tab S9", os: "Android", osVersion: "14" },
    // Desktop browsers
    { itemType: "browser", name: "Desktop", os: "Windows/macOS", osVersion: "-", browser: "Chrome", browserVersion: "129+" },
    { itemType: "browser", name: "Desktop", os: "Windows/macOS", osVersion: "-", browser: "Chrome", browserVersion: "128" },
    { itemType: "browser", name: "Desktop", os: "macOS Sequoia", osVersion: "14+", browser: "Safari", browserVersion: "18" },
    { itemType: "browser", name: "macOS Sonoma", os: "macOS Sonoma", osVersion: "14", browser: "Safari", browserVersion: "17" },
    { itemType: "browser", name: "Desktop", os: "Windows/macOS", osVersion: "-", browser: "Edge", browserVersion: "129+" },
    { itemType: "browser", name: "Desktop", os: "Windows/macOS", osVersion: "-", browser: "Edge", browserVersion: "128" },
    { itemType: "browser", name: "Desktop", os: "Windows/macOS", osVersion: "-", browser: "Firefox", browserVersion: "130+" },
  ];

  const languages = [
    "zh-TW",
    "zh-CN",
    "en",
    "ja",
    "ko",
    "es",
    "fr",
    "de",
    "ru",
    "ar",
    "pt",
    "pt-BR",
  ];

  const commandIds = [
    "play",
    "pause",
    "stop",
    "forward10",
    "forward20",
    "forward30",
    "backward10",
    "backward20",
    "backward30",
    "volumeUp",
    "volumeDown",
    "volumeMax",
    "mute",
    "unmute",
    "speed05",
    "speed1",
    "speed125",
    "speed15",
    "speed2",
    "fullscreen",
    "exitFullscreen",
    "bookmark",
    "favorite",
  ];

  const header = [
    "suite",
    "itemType",
    "name",
    "os",
    "osVersion",
    "browser",
    "browserVersion",
    "language",
    "commandId",
    "videoUrl",
    "testId",
  ].join(",");

  const rows: string[] = [header];
  const suite = "VoiceControlMatrix";

  for (const d of devices) {
    for (const lang of languages) {
      for (const cmd of commandIds) {
        const testId = [
          suite,
          d.itemType,
          d.name.replace(/[^A-Za-z0-9]+/g, "-"),
          d.os.replace(/[^A-Za-z0-9]+/g, "-"),
          (d.browser ?? "-").replace(/[^A-Za-z0-9]+/g, "-"),
          lang,
          cmd,
        ]
          .join("_")
          .replace(/-+/g, "-")
          .toLowerCase();

        const row: MatrixRow = {
          suite,
          itemType: d.itemType,
          name: d.name,
          os: d.os,
          osVersion: d.osVersion,
          browser: d.browser ?? "",
          browserVersion: d.browserVersion ?? "",
          language: lang,
          commandId: cmd,
          videoUrl,
          testId,
        };

        rows.push(
          [
            row.suite,
            row.itemType,
            row.name,
            row.os,
            row.osVersion,
            row.browser,
            row.browserVersion,
            row.language,
            row.commandId,
            row.videoUrl,
            row.testId,
          ]
            .map((v) => {
              if (v.includes(",") || v.includes("\"")) {
                return `"${v.replace(/\"/g, '"')}"`;
              }
              return v;
            })
            .join(",")
        );
      }
    }
  }

  const csv = rows.join("\n");
  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", "attachment; filename=voice-test-matrix.csv");
  return c.body(csv);
});

export default app;