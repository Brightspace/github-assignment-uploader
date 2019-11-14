const express = require("express");
import { Request, Response, Router } from "express";
import { UserService, IUserService } from "../model/UserService";
import { User, IUser } from "../entities/User";
import { ISubmission, Submission } from "../entities/Submission";
import passport from "passport";
import { Strategy } from "passport-github2";
import bodyParser from "body-parser";
import session from "express-session";
import methodOverride from "method-override";

const wrapEndpoint = (logic: (req: Request) => any): (req: Request, res: Response) => void => {
  return async (req: Request, res: Response) => {
    try {
      const response: any = await logic(req);
      res.send(response);
    } catch (error) {
      console.error(error);
      res.statusCode = error.status ? error.status : 500;
      res.json({ message: error.toString(), status: res.statusCode });
    }
  }
}

const redirectUser = (logic: (req: Request) => Promise<{ url: URL }>): (req: Request, res: Response) => void => {
  return async (req: Request, res: Response) => {
    const data = await logic(req)
    res.status(301).redirect(data.url.toString())
  }
}

export const createRepoRouter = (userServiceImpl: IUserService, clientId: string, clientSecret: string): Router => {
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
    const submission: Submission = new Submission({ blob });
    return submission;
  }

  const getPublicURL = async (req: Request): Promise<{ url: URL }> => {
    const service: UserService = new UserService("NOT DEFINED", userServiceImpl);
    const url: URL = await service.getPublicURL()
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

  const getRepoArchiveLink = async (req: Request): Promise<{ url: URL }> => {
    const username: string = req.params.user
    const repoName: string = req.params.repo
    if (!username) {
      throw new Error("Did not include user in request.");
    }
    if (!repoName) {
      throw new Error("Did not include repo name in request.");
    }
    const service: UserService = new UserService(username, userServiceImpl);
    return { url: await service.getArchiveLink(repoName) };
  }
  
  const hasUserInstalled = async (req: Request): Promise<{ installed: boolean }> => {
    const username: string = req.params.user
    if (!username) {
      throw new Error("Did not include user in request.");
    }

    let result: boolean = true
    try {
      await getUserInfo(req)
    } catch {
      result = false
    }

    return { installed: result };
  }

  const router: Router = express.Router();

  // Passport session setup.
  //   To support persistent login sessions, Passport needs to be able to
  //   serialize users into and deserialize users out of the session.  Typically,
  //   this will be as simple as storing the user ID when serializing, and finding
  //   the user by ID when deserializing.  However, since this example does not
  //   have a database of user records, the complete GitHub profile is serialized
  //   and deserialized.
  passport.serializeUser(function(user, done) {
    done(null, user);
  });

  passport.deserializeUser(function(obj, done) {
    done(null, obj);
  });


  // Use the GitHubStrategy within Passport.
  //   Strategies in Passport require a `verify` function, which accept
  //   credentials (in this case, an accessToken, refreshToken, and GitHub
  //   profile), and invoke a callback with a user object.
  passport.use(new Strategy({
      clientID: clientId,
      clientSecret: clientSecret,
      callbackURL: "http://127.0.0.1:3000/app/auth/github/callback"
    },
    function(accessToken, refreshToken, profile, done) {
      // asynchronous verification, for effect...
      process.nextTick(function () {
        
        // To keep the example simple, the user's GitHub profile is returned to
        // represent the logged-in user.  In a typical routerlication, you would want
        // to associate the GitHub account with a user record in your database,
        // and return that user instead.
        return done(null, profile);
      });
    }
  ));

  // configure Express
  router.use(bodyParser.urlencoded({ extended: true }));
  router.use(bodyParser.json());
  router.use(methodOverride());
  router.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  router.use(passport.initialize());
  router.use(passport.session());

  router.get('/', function(req, res){
    res.send(req.user);
  });

  router.get('/account', ensureAuthenticated, function(req, res){
    res.send(req.user);
  });

  router.get('/login', function(req, res){
    res.send(req.user);
  });

  // GET /auth/github
  //   Use passport.authenticate() as route middleware to authenticate the
  //   request.  The first step in GitHub authentication will involve redirecting
  //   the user to github.com.  After authorization, GitHub will redirect the user
  //   back to this routerlication at /auth/github/callback
  router.get('/auth/github',
    passport.authenticate('github', { scope: [ 'user:email' ] }),
    function(req, res){
      // The request will be redirected to GitHub for authentication, so this
      // function will not be called.
    });

  // GET /auth/github/callback
  //   Use passport.authenticate() as route middleware to authenticate the
  //   request.  If authentication fails, the user will be redirected back to the
  //   login page.  Otherwise, the primary route function will be called,
  //   which, in this example, will redirect the user to the home page.
  router.get('/auth/github/callback', 
    passport.authenticate('github', { failureRedirect: '/app/login' }),
    function(req, res) {
      res.redirect('/');
    });

  router.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
  });

  // Simple route middleware to ensure user is authenticated.
  //   Use this route middleware on any resource that needs to be protected.  If
  //   the request is authenticated (typically via a persistent login session),
  //   the request will proceed.  Otherwise, the user will be redirected to the
  //   login page.
  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/app/login')
  }

  router.get("/repo/:user", ensureAuthenticated, wrapEndpoint(getUserInfo));
  router.get("/repo/:user/:repo", ensureAuthenticated, wrapEndpoint(getRepoArchive));
  router.get("/repo/:user/:repo/link", ensureAuthenticated, wrapEndpoint(getRepoArchiveLink));
  router.get("/install", redirectUser(getPublicURL));
  router.get("/installed/:user", wrapEndpoint(hasUserInstalled))
  return router
}
