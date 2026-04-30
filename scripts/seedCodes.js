const mongoose = require("mongoose");
const dotenv = require("dotenv");

const AccessCode = require("../src/models/AccessCode");

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/chocoplay";

const seedCodes = [
  "CHOCO-12345",
  "CHOCO-12346",
  "CHOCO-12347",
  "CHOCO-12348",
  "CHOCO-12349",
];

async function run() {
  try {
    await mongoose.connect(MONGO_URI);

    const operations = seedCodes.map((code) => ({
      updateOne: {
        filter: { code },
        update: { $setOnInsert: { code, used: false } },
        upsert: true,
      },
    }));

    const result = await AccessCode.bulkWrite(operations, { ordered: false });
    console.log("Seed complete:", result);
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
}

run();
