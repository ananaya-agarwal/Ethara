const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireProjectAdmin } = require("../utils/projectAccess");

const router = express.Router();

router.get("/", async (req, res) => {
  const projects = await prisma.membership.findMany({
    where: { userId: req.user.id },
    select: {
      role: true,
      project: {
        select: { id: true, name: true, description: true, createdAt: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  res.json(
    projects.map((m) => ({
      ...m.project,
      role: m.role
    }))
  );
});

router.post("/", async (req, res) => {
  try {
    const payload = z.object({ name: z.string().min(2), description: z.string().optional() }).parse(req.body);
    const created = await prisma.project.create({
      data: {
        name: payload.name,
        description: payload.description,
        memberships: {
          create: {
            userId: req.user.id,
            role: "ADMIN"
          }
        }
      }
    });
    res.status(201).json(created);
  } catch (err) {
    if (err.name === "ZodError") return res.status(400).json({ message: "Invalid project data", errors: err.errors });
    return res.status(500).json({ message: "Failed to create project" });
  }
});

router.get("/:projectId/members", async (req, res) => {
  const membership = await prisma.membership.findUnique({
    where: { userId_projectId: { userId: req.user.id, projectId: req.params.projectId } }
  });
  if (!membership) return res.status(403).json({ message: "Project access denied" });

  const members = await prisma.membership.findMany({
    where: { projectId: req.params.projectId },
    select: {
      id: true,
      role: true,
      user: { select: { id: true, name: true, email: true } }
    }
  });
  res.json(members);
});

router.post("/:projectId/members", requireProjectAdmin, async (req, res) => {
  try {
    const payload = z.object({ email: z.string().email(), role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER") }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const member = await prisma.membership.upsert({
      where: { userId_projectId: { userId: user.id, projectId: req.params.projectId } },
      update: { role: payload.role },
      create: { userId: user.id, projectId: req.params.projectId, role: payload.role },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    res.status(201).json(member);
  } catch (err) {
    if (err.name === "ZodError") return res.status(400).json({ message: "Invalid member data", errors: err.errors });
    return res.status(500).json({ message: "Failed to add member" });
  }
});

router.delete("/:projectId/members/:memberId", requireProjectAdmin, async (req, res) => {
  const member = await prisma.membership.findUnique({ where: { id: req.params.memberId } });
  if (!member || member.projectId !== req.params.projectId) {
    return res.status(404).json({ message: "Member not found" });
  }

  await prisma.membership.delete({ where: { id: req.params.memberId } });
  res.status(204).send();
});

module.exports = router;
