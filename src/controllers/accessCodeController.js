const AccessCode = require("../models/AccessCode");

function normalizeCode(rawCode = "") {
  return String(rawCode).trim().toUpperCase();
}

exports.validateAccessCode = async (req, res) => {
  try {
    console.log(req.body);
    // const code = normalizeCode(req.body?.code);

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
        redirectTo: "/landingPage.html",
      });
    }

    const existing = await AccessCode.findOne({ code }).lean();
    console.log(existing);
    if (!existing) {
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
