const express = require("express");
import { Request, Response } from "express";
const bodyParser = require("body-parser");
const helmet = require("helmet");
import { createRepoRouter } from "./routes/RepoRouter";
import { UserServiceStub } from "./stubs/UserServiceStub";

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet());

//app.use("/app", createRepoRouter(new UserServiceStub()));

app.get("/healthstatus", (req: Request, res: Response) => {
  res.json({ status: "healthy" });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
