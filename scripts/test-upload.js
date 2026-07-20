const { put } = require("@vercel/blob");
const fs = require("fs");
const path = require("path");

// Load .env manually
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([^#\s=]+)\s*=\s*(.*)$/);
    if (match) {
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      process.env[match[1]] = val;
    }
  });
}

console.log("BLOB_READ_WRITE_TOKEN:", process.env.BLOB_READ_WRITE_TOKEN ? "Present" : "Missing");

async function run() {
  try {
    console.log("Attempting public upload...");
    const blob1 = await put("test-public.txt", "hello public", {
      access: "public",
      addRandomSuffix: false
    });
    console.log("Public upload succeeded:", blob1.url);
  } catch (err) {
    console.error("Public upload failed:", err.message);
    if (err.message.includes("private store") || err.message.includes("Forbidden")) {
      console.log("Attempting private upload...");
      try {
        const blob2 = await put("test-private.txt", "hello private", {
          access: "private",
          addRandomSuffix: false
        });
        console.log("Private upload succeeded:", blob2.url);
      } catch (err2) {
        console.error("Private upload failed:", err2.message);
      }
    }
  }
}

run();
