const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireProjectMembership } = require("../utils/projectAccess");

const router = express.Router({ mergeParams: true });

const taskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  dueDate: z.string().datetime(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  assigneeId: z.string().optional()
});

router.get("/", requireProjectMembership, async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { projectId: req.params.projectId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true } }
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }]
  });

  const isAdmin = req.membership.role === "ADMIN";
  res.json(isAdmin ? tasks : tasks.filter((task) => task.assigneeId === req.user.id));
});

router.post("/", requireProjectMembership, async (req, res) => {
  if (req.membership.role !== "ADMIN") return res.status(403).json({ message: "Only admins can create tasks" });

  try {
    const payload = taskSchema.parse(req.body);
    if (payload.assigneeId) {
      const assigneeMembership = await prisma.membership.findUnique({
        where: { userId_projectId: { userId: payload.assigneeId, projectId: req.params.projectId } }
      });
      if (!assigneeMembership) return res.status(400).json({ message: "Assignee must be a project member" });
    }

    const task = await prisma.task.create({
      data: {
        ...payload,
        dueDate: new Date(payload.dueDate),
        projectId: req.params.projectId,
        creatorId: req.user.id
      }
    });
    res.status(201).json(task);
  } catch (err) {
    if (err.name === "ZodError") return res.status(400).json({ message: "Invalid task data", errors: err.errors });
    return res.status(500).json({ message: "Failed to create task" });
  }
});

router.patch("/:taskId/status", requireProjectMembership, async (req, res) => {
  try {
    const payload = z.object({ status: z.enum(["TODO", "IN_PROGRESS", "DONE"]) }).parse(req.body);
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task || task.projectId !== req.params.projectId) return res.status(404).json({ message: "Task not found" });

    const isAdmin = req.membership.role === "ADMIN";
    if (!isAdmin && task.assigneeId !== req.user.id) {
      return res.status(403).json({ message: "You can only update your assigned tasks" });
    }

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { status: payload.status }
    });
    res.json(updated);
  } catch (err) {
    if (err.name === "ZodError") return res.status(400).json({ message: "Invalid status data", errors: err.errors });
    return res.status(500).json({ message: "Failed to update task status" });
  }
});

module.exports = router;
