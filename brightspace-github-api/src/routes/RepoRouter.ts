const express = require("express");
import { Request, Response, Router } from "express";
import { UserService, IUserService } from "../model/UserService";
import { User, IUser } from "../entities/User";
import { ISubmission, Submission } from "../entities/Submission";

const wrapEndpoint = (logic: (req: Request) => any): (req: Request, res: Response) => void => {
  return async (req: Request, res: Response) => {
    try {
      const response: any = await logic(req);
      res.send(response);
    } catch (error) {
      console.error(error);
      res.statusCode = 500;
      res.json({ message: error.toString() });
    }
  }
}

export const createRepoRouter = (userServiceImpl: IUserService): Router => {
  const getRepoArchive = async (req: Request): Promise<ISubmission> => {
    const username: string = req.params.user
    const repoName: string = req.params.repo
    if (!username) {
      throw new Error("Did not include user in request.");
    }
    if (!repoName) {
      throw new Error("Did not include repo name in request.");
    }
    const service: UserService = new UserService(username, userServiceImpl);
    const blob = await service.getRepoAsArchive(repoName);
    console.log(blob)
    const submission: Submission = new Submission({ blob });
    return submission;
  }

  const getPublicURL = async (req: Request): Promise<{ url: URL }> => {
    const service: UserService = new UserService("NOT DEFINED", userServiceImpl);
    const url: URL = await service.getPublicURL()
    console.log(url)
    return { url }
  }

  const getUserInfo = async (req: Request): Promise<IUser> => {
    const username: string = req.params.user
    if (!username) {
      throw new Error("Did not include user in request.");
    }
    const service: UserService = new UserService(username, userServiceImpl);
    const installationId: string = await service.getInstallationIdForUser();
    const repos: string[] = await service.getAvailableReposForUser();
    return new User({ username, installationId, repos: repos.map((repo: string) => ({ repoName: repo })) })
  }

  const router: Router = express.Router();
  router.get("/repo/:user", wrapEndpoint(getUserInfo));
  router.get("/repo/:user/:repo", wrapEndpoint(getRepoArchive));
  router.get("/publicurl", wrapEndpoint(getPublicURL));
  return router
}
