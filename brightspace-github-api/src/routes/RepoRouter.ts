const express = require("express");
import { Request, Response, Router } from "express";
import { UserService, IUserService } from "../model/UserService";
import { User, IUser } from "../entities/User";

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
  // const userEndpoint = async (req: Request): Promise<any> => {
  //   const user: string = req.params.user
  //   if (!user) {
  //     throw new Error("Did not include user in request.");
  //   }

  //   const user: IUser = new User({ username:  });
  //   const service: UserService = new UserService(user, userServiceImpl);
  //   res.send(service.getAvailableReposForUser())
  // }

  const getRepoArchive = async (req: Request): Promise<{ blob: Uint8Array }> => {
    const username: string = req.params.user
    const repoName: string = req.params.repo
    if (!username) {
      throw new Error("Did not include user in request.");
    }
    if (!repoName) {
      throw new Error("Did not include repo name in request.");
    }
    const service: UserService = new UserService(username, userServiceImpl);
    const blob: Uint8Array = service.getRepoAsArchive(repoName);
    return { blob };
  }

  const getPublicURL = async (req: Request): Promise<{ url: URL }> => {
    const service: UserService = new UserService("NOT DEFINED", userServiceImpl);
    const url: URL = service.getPublicURL();
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
    const user: IUser = new User({ username, installationId, repos: repos.map((repo: string) => ({ repoName: repo })) })
    return user
  }

  const router: Router = express.Router();
  router.get("/repo/:user", wrapEndpoint(getUserInfo));
  router.get("/repo/:user/:repo", wrapEndpoint(getRepoArchive));
  router.get("/publicurl", wrapEndpoint(getPublicURL));
  return router
}
