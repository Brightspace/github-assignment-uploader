const express = require("express");
import { Request, Response, Router } from "express";

const router: Router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    res.json({ BasicRouter: true })
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.json({ message: error.toString() });
  }
});

export const BasicRouter: Router = router;
