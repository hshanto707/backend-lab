import express, { Application, Router } from "express";
import BaseController from "../controllers/base.controller.js";

export default class BaseRoute {
  router = Router();
  basePath = "/api/v1";

  constructor(private readonly app: Application) {
    this.app = app;
    
    this.setupRoutes();
    this.app.use(this.basePath, this.router);
  }

  setupRoutes() {
    this.router.get("/healthz", (_req, res) => {
      res.json({ status: "very ok" });
    });

    this.router.get(`/sum`, async (_req, res) => {
      res.json({ sum: await new BaseController().getSum() });
    });
  }
}
