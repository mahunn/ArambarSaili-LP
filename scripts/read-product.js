const { get } = require("@vercel/blob");
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

const PRODUCT_JSON_BLOB_PATH = "arambarsaili/product.json";

async function run() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    console.log("Token:", token ? "Present" : "Missing");
    const result = await get(PRODUCT_JSON_BLOB_PATH, { token, access: "public" });
    if (!result) {
      console.log("No product JSON found in Blob.");
      return;
    }
    const text = await new Response(result.stream).text();
    console.log("Product JSON contents:");
    console.log(text);
  } catch (err) {
    console.error("Error reading product JSON from Blob:", err.message);
  }
}

run();
