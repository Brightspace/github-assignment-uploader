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
  router.get("/:user", wrapEndpoint(getUserInfo));
  return router
}
