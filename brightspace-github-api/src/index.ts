const express = require("express");
import { Request, Response } from "express";
const bodyParser = require("body-parser");
const helmet = require("helmet");
import { BasicRouter } from "./routes/BasicRouter";

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet());

app.use("/BasicRouter", BasicRouter);

app.get("/healthstatus", (req: Request, res: Response) => {
  res.json({ status: "healthy" });
});

const port = 5000;
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
