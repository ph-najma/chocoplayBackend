const AccessCode = require("../models/AccessCode");

function normalizeCode(rawCode = "") {
  return String(rawCode)
    .normalize("NFKC")
    .trim()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, "")
    .toUpperCase();
}

exports.validateAccessCode = async (req, res) => {
  try {
    const code = normalizeCode(req.body?.code);

    if (!code) {
      return res.status(400).json({
        ok: false,
        message: "Access code is required.",
      });
    }

    // Atomic update to prevent race conditions when two scans happen together.
    const matchedCode = await AccessCode.findOneAndUpdate(
      { code, used: false },
      {
        $set: {
          used: true,
          usedAt: new Date(),
          usedByIp: req.ip || null,
        },
      },
      { new: true },
    ).lean();

    if (matchedCode) {
      return res.status(200).json({
        ok: true,
        message: "Code validated. Access granted.",
        redirectTo: "/landing",
      });
    }

    const existing = await AccessCode.findOne({ code }).lean();
    if (!existing) {
      const totalCodes = await AccessCode.estimatedDocumentCount();
      if (totalCodes === 0) {
        return res.status(503).json({
          ok: false,
          message:
            "Access codes are not configured on server yet. Please contact support.",
        });
      }

      return res.status(404).json({
        ok: false,
        message: "Invalid access code.",
      });
    }

    return res.status(409).json({
      ok: false,
      message: "This access code was already used.",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Unexpected server error.",
      error: error.message,
    });
  }
};
