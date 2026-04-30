const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const QRCode = require("qrcode");

const AccessCode = require("../src/models/AccessCode");

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/chocoplay";
const BASE_QR_URL = process.env.BASE_QR_URL || "http://localhost:4200/access";

function parseArgs() {
  const args = process.argv.slice(2);
  const map = {};

  for (const arg of args) {
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.replace(/^--/, "").split("=");
    map[key] = value ?? true;
  }

  return {
    count: Number(map.count ?? 10),
    prefix: String(map.prefix ?? "CHOCO"),
    digits: Number(map.digits ?? 5),
    batch: String(map.batch ?? `BATCH-${Date.now()}`),
  };
}

function generateCode(prefix, digits) {
  const max = 10 ** digits;
  const random = crypto.randomInt(0, max);
  return `${prefix}-${String(random).padStart(digits, "0")}`;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function main() {
  const { count, prefix, digits, batch } = parseArgs();

  if (!Number.isFinite(count) || count <= 0) {
    throw new Error("Invalid --count. Use a positive number.");
  }

  await mongoose.connect(MONGO_URI);

  const generated = [];
  const seen = new Set();

  while (generated.length < count) {
    const code = generateCode(prefix, digits);
    if (seen.has(code)) continue;
    seen.add(code);
    generated.push(code);
  }

  const qrDir = path.resolve(__dirname, "..", "..", "generated", "qr", batch);
  const csvDir = path.resolve(__dirname, "..", "..", "generated", "exports");
  await ensureDir(qrDir);
  await ensureDir(csvDir);

  const operations = generated.map((code) => ({
    updateOne: {
      filter: { code },
      update: {
        $setOnInsert: {
          code,
          qrBatch: batch,
          used: false,
          usedAt: null,
          usedByIp: null,
        },
      },
      upsert: true,
    },
  }));

  const writeResult = await AccessCode.bulkWrite(operations, { ordered: false });

  const csvRows = ["code,qrUrl,qrImagePath,batch"];
  for (const code of generated) {
    const qrUrl = `${BASE_QR_URL}?code=${encodeURIComponent(code)}`;
    const imagePath = path.join(qrDir, `${code}.png`);
    await QRCode.toFile(imagePath, qrUrl, { width: 420, margin: 2 });
    csvRows.push(`${code},"${qrUrl}","${imagePath.replace(/\\/g, "/")}","${batch}"`);
  }

  const csvPath = path.join(csvDir, `codes-${batch}.csv`);
  await fs.writeFile(csvPath, csvRows.join("\n"), "utf8");

  console.log("Batch complete");
  console.log(`Batch: ${batch}`);
  console.log(`Requested: ${count}`);
  console.log(`Mongo upsert result:`, writeResult);
  console.log(`QR folder: ${qrDir}`);
  console.log(`CSV export: ${csvPath}`);
}

main()
  .catch((error) => {
    console.error("Generation failed:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
