const prisma = require("../config/db");

async function getMembership(projectId, userId) {
  return prisma.membership.findUnique({
    where: {
      userId_projectId: { userId, projectId }
    }
  });
}

async function requireProjectMembership(req, res, next) {
  const { projectId } = req.params;
  const membership = await getMembership(projectId, req.user.id);
  if (!membership) return res.status(403).json({ message: "Project access denied" });
  req.membership = membership;
  next();
}

async function requireProjectAdmin(req, res, next) {
  const { projectId } = req.params;
  const membership = await getMembership(projectId, req.user.id);
  if (!membership || membership.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required" });
  }
  req.membership = membership;
  next();
}

module.exports = { requireProjectMembership, requireProjectAdmin };
