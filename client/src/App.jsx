import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api" });

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [authForm, setAuthForm] = useState({ mode: "login", name: "", email: "", password: "" });
  const [newProject, setNewProject] = useState({ name: "", description: "" });
  const [newMember, setNewMember] = useState({ email: "", role: "MEMBER" });
  const [newTask, setNewTask] = useState({ title: "", description: "", dueDate: "", priority: "MEDIUM", assigneeId: "" });
  const [error, setError] = useState("");

  const selectedProject = useMemo(() => projects.find((p) => p.id === selectedProjectId), [projects, selectedProjectId]);
  const isAdmin = selectedProject?.role === "ADMIN";

  useEffect(() => {
    if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
    else delete api.defaults.headers.common.Authorization;
  }, [token]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      await Promise.all([loadMe(), loadProjects(), loadDashboard()]);
    })();
  }, [token]);

  useEffect(() => {
    if (!selectedProjectId) return;
    (async () => {
      await Promise.all([loadMembers(selectedProjectId), loadTasks(selectedProjectId)]);
    })();
  }, [selectedProjectId]);

  async function loadMe() {
    const res = await api.get("/auth/me");
    setUser(res.data.user);
  }
  async function loadProjects() {
    const res = await api.get("/projects");
    setProjects(res.data);
    if (!selectedProjectId && res.data[0]) setSelectedProjectId(res.data[0].id);
  }
  async function loadMembers(projectId) {
    const res = await api.get(`/projects/${projectId}/members`);
    setMembers(res.data);
  }
  async function loadTasks(projectId) {
    const res = await api.get(`/projects/${projectId}/tasks`);
    setTasks(res.data);
  }
  async function loadDashboard() {
    const res = await api.get("/dashboard");
    setDashboard(res.data);
  }

  async function handleAuth(e) {
    e.preventDefault();
    try {
      setError("");
      const endpoint = authForm.mode === "signup" ? "/auth/signup" : "/auth/login";
      const payload = authForm.mode === "signup"
        ? { name: authForm.name, email: authForm.email, password: authForm.password }
        : { email: authForm.email, password: authForm.password };
      const res = await api.post(endpoint, payload);
      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed");
    }
  }

  async function handleCreateProject(e) {
    e.preventDefault();
    await api.post("/projects", newProject);
    setNewProject({ name: "", description: "" });
    await loadProjects();
  }
  async function handleAddMember(e) {
    e.preventDefault();
    await api.post(`/projects/${selectedProjectId}/members`, newMember);
    setNewMember({ email: "", role: "MEMBER" });
    await loadMembers(selectedProjectId);
  }
  async function handleCreateTask(e) {
    e.preventDefault();
    await api.post(`/projects/${selectedProjectId}/tasks`, {
      ...newTask,
      dueDate: new Date(newTask.dueDate).toISOString()
    });
    setNewTask({ title: "", description: "", dueDate: "", priority: "MEDIUM", assigneeId: "" });
    await Promise.all([loadTasks(selectedProjectId), loadDashboard()]);
  }
  async function handleStatusUpdate(taskId, status) {
    await api.patch(`/projects/${selectedProjectId}/tasks/${taskId}/status`, { status });
    await Promise.all([loadTasks(selectedProjectId), loadDashboard()]);
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setProjects([]);
    setSelectedProjectId("");
    setMembers([]);
    setTasks([]);
    setDashboard(null);
  }

  if (!token) {
    return (
      <main className="container auth">
        <h1>Team Task Manager</h1>
        <form onSubmit={handleAuth} className="panel">
          <h2>{authForm.mode === "signup" ? "Create account" : "Login"}</h2>
          {authForm.mode === "signup" && (
            <input placeholder="Name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} />
          )}
          <input placeholder="Email" type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
          <input placeholder="Password" type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
          {error && <p className="error">{error}</p>}
          <button type="submit">{authForm.mode === "signup" ? "Sign up" : "Login"}</button>
          <button type="button" className="secondary" onClick={() => setAuthForm({ ...authForm, mode: authForm.mode === "signup" ? "login" : "signup" })}>
            {authForm.mode === "signup" ? "Have an account? Login" : "New user? Sign up"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="header">
        <div><h1>Team Task Manager</h1><p>Welcome, {user?.name}</p></div>
        <button onClick={logout}>Logout</button>
      </header>

      {dashboard && (
        <section className="grid">
          <article className="panel"><h3>Total Tasks</h3><p>{dashboard.totalTasks}</p></article>
          <article className="panel"><h3>To Do</h3><p>{dashboard.byStatus.TODO}</p></article>
          <article className="panel"><h3>In Progress</h3><p>{dashboard.byStatus.IN_PROGRESS}</p></article>
          <article className="panel"><h3>Done</h3><p>{dashboard.byStatus.DONE}</p></article>
          <article className="panel"><h3>Overdue</h3><p>{dashboard.overdueTasks}</p></article>
        </section>
      )}

      <section className="split">
        <div className="panel">
          <h2>Projects</h2>
          <form onSubmit={handleCreateProject}>
            <input placeholder="Project name" required value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} />
            <input placeholder="Description" value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} />
            <button type="submit">Create Project</button>
          </form>
          <ul>
            {projects.map((project) => (
              <li key={project.id}>
                <button className={selectedProjectId === project.id ? "selected" : "secondary"} onClick={() => setSelectedProjectId(project.id)}>
                  {project.name} ({project.role})
                </button>
              </li>
            ))}
          </ul>
        </div>

        {selectedProjectId && (
          <div className="panel">
            <h2>Members - {selectedProject?.name}</h2>
            {isAdmin && (
              <form onSubmit={handleAddMember}>
                <input placeholder="User email" required type="email" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} />
                <select value={newMember.role} onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button type="submit">Add Member</button>
              </form>
            )}
            <ul>{members.map((m) => <li key={m.id}>{m.user.name} ({m.role})</li>)}</ul>
          </div>
        )}
      </section>

      {selectedProjectId && (
        <section className="panel">
          <h2>Tasks</h2>
          {isAdmin && (
            <form onSubmit={handleCreateTask} className="task-form">
              <input placeholder="Title" required value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
              <input placeholder="Description" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} />
              <input type="date" required value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
              <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}>
                <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
              </select>
              <select value={newTask.assigneeId} onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}>
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
              </select>
              <button type="submit">Create Task</button>
            </form>
          )}
          <table>
            <thead><tr><th>Title</th><th>Assignee</th><th>Status</th><th>Due</th><th>Priority</th></tr></thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.title}</td>
                  <td>{task.assignee?.name || "Unassigned"}</td>
                  <td>
                    <select value={task.status} onChange={(e) => handleStatusUpdate(task.id, e.target.value)}>
                      <option value="TODO">To Do</option><option value="IN_PROGRESS">In Progress</option><option value="DONE">Done</option>
                    </select>
                  </td>
                  <td>{new Date(task.dueDate).toLocaleDateString()}</td>
                  <td>{task.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}

export default App;
