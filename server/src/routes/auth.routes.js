const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const prisma = require("../config/db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

router.post("/signup", async (req, res) => {
  try {
    const payload = signupSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: payload.email } });
    if (exists) return res.status(409).json({ message: "Email already in use" });

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await prisma.user.create({
      data: { name: payload.name, email: payload.email, passwordHash },
      select: { id: true, name: true, email: true }
    });
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    return res.status(201).json({ user, token });
  } catch (err) {
    if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
    return res.status(500).json({ message: "Could not create account" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const payload = z.object({ email: z.string().email(), password: z.string().min(6) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    return res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (err) {
    if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
    return res.status(500).json({ message: "Login failed" });
  }
});

router.get("/me", authRequired, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
