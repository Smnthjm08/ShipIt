import { Router, Request, Response } from "express";
import authMiddleware from "../middlewares/auth.middleware";
import {
  newProjectController,
  createProjectController,
} from "../controllers/new-project.controller";
import {
  listProjectsController,
  getProjectController,
  deleteProjectController,
} from "../controllers/project.controller";
import {
  listDeploymentsController,
  redeployController,
  getDeploymentController,
  getDeploymentLogsController,
  deleteDeploymentController,
} from "../controllers/deployment.controller";

const v1Router: Router = Router();

v1Router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "OK", message: "healthy!" });
});

// Repo search + project creation (the "import a repo" flow).
v1Router.get("/new", authMiddleware, newProjectController);
v1Router.post("/new", authMiddleware, createProjectController);

// Projects
v1Router.get("/projects", authMiddleware, listProjectsController);
v1Router.get("/projects/:projectId", authMiddleware, getProjectController);
v1Router.delete(
  "/projects/:projectId",
  authMiddleware,
  deleteProjectController,
);

// Deployments scoped to a project
v1Router.get(
  "/projects/:projectId/deployments",
  authMiddleware,
  listDeploymentsController,
);
v1Router.post(
  "/projects/:projectId/deployments",
  authMiddleware,
  redeployController,
);

// Individual deployments
v1Router.get(
  "/deployments/:deploymentId",
  authMiddleware,
  getDeploymentController,
);
v1Router.get(
  "/deployments/:deploymentId/logs",
  authMiddleware,
  getDeploymentLogsController,
);
v1Router.delete(
  "/deployments/:deploymentId",
  authMiddleware,
  deleteDeploymentController,
);

export default v1Router;
