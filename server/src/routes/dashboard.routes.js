const express = require("express");
const prisma = require("../config/db");

const router = express.Router();

router.get("/", async (req, res) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: req.user.id },
    select: { projectId: true, role: true }
  });

  const projectIds = memberships.map((m) => m.projectId);
  if (!projectIds.length) {
    return res.json({
      totalTasks: 0,
      byStatus: { TODO: 0, IN_PROGRESS: 0, DONE: 0 },
      tasksPerUser: [],
      overdueTasks: 0
    });
  }

  const isAdminByProject = new Map(memberships.map((m) => [m.projectId, m.role === "ADMIN"]));
  const tasks = await prisma.task.findMany({
    where: { projectId: { in: projectIds } },
    include: { assignee: { select: { id: true, name: true } } }
  });

  const visibleTasks = tasks.filter((task) => isAdminByProject.get(task.projectId) || task.assigneeId === req.user.id);

  const byStatus = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  const tasksPerUserMap = new Map();
  const now = new Date();
  let overdueTasks = 0;

  for (const task of visibleTasks) {
    byStatus[task.status] += 1;
    if (task.status !== "DONE" && new Date(task.dueDate) < now) overdueTasks += 1;

    const userName = task.assignee?.name || "Unassigned";
    tasksPerUserMap.set(userName, (tasksPerUserMap.get(userName) || 0) + 1);
  }

  res.json({
    totalTasks: visibleTasks.length,
    byStatus,
    tasksPerUser: Array.from(tasksPerUserMap, ([name, count]) => ({ name, count })),
    overdueTasks
  });
});

module.exports = router;
