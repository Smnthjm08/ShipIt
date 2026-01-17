import { Router } from "express";
import { getAllProjectsController } from "../controllers/projects.controller";

const projectsRoutes: Router = Router();

projectsRoutes.get("/", getAllProjectsController);

projectsRoutes.post("/", (req, res) => {
  res.send("List of projects");
});

projectsRoutes.get("/:id", (req, res) => {
  res.send("get by id of projects");
});

projectsRoutes.put("/:id", (req, res) => {
  res.send("put by id of projects");
});

projectsRoutes.delete("/:id", (req, res) => {
  res.send("delete by id of projects");
});

export default projectsRoutes;
