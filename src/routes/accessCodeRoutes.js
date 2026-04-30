const express = require("express");
const { validateAccessCode } = require("../controllers/accessCodeController");

const router = express.Router();

router.post("/validate", validateAccessCode);

module.exports = router;
