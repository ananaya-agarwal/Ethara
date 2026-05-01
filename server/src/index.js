require("dotenv").config();
const express = require("express");
const cors = require("cors");
const prisma = require("./config/db");
const { authRequired } = require("./middleware/auth");
const authRoutes = require("./routes/auth.routes");
const projectRoutes = require("./routes/projects.routes");
const taskRoutes = require("./routes/tasks.routes");
const dashboardRoutes = require("./routes/dashboard.routes");

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(",") || "*" }));
app.use(express.json());

app.get("/health", (_, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/projects", authRequired, projectRoutes);
app.use("/api/projects/:projectId/tasks", authRequired, taskRoutes);
app.use("/api/dashboard", authRequired, dashboardRoutes);

app.use((_, res) => res.status(404).json({ message: "Route not found" }));

app.use((err, _, res, __) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong" });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, async () => {
  await prisma.$connect();
  console.log(`Server running on ${port}`);
});
