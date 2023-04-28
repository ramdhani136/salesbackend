import { Router, Request, Response } from "express";
import IRouter from "./RouteInterface";


abstract class RouteBase implements IRouter {
    public router: Router;
    constructor() {
      this.router = Router();
      this.routes();
    }
    abstract routes(): void;
}

export default RouteBase;