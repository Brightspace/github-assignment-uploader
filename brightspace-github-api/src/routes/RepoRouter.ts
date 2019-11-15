const express = require('express')
import { Request, Response, Router } from 'express'
import { UserService, IUserService } from '../model/UserService'
import { User, IUser } from '../entities/User'
import { ISubmission, Submission } from '../entities/Submission'
import passport from 'passport'
import { Strategy } from 'passport-github2'
import bodyParser from 'body-parser'
import session from 'express-session'
import methodOverride from 'method-override'
import cors from "cors"

class StatusError extends Error {
  constructor(message: string, private status: number) {
    super(message)
  }
}

const isLambda: boolean = !!(process.env.LAMBDA_TASK_ROOT || false);
const lambdaPrefix: string = '/dev'

const wrapEndpoint = (logic: (req: Request) => any): (req: Request, res: Response) => void => {
  return async (req: Request, res: Response) => {
    try {
      const response: any = await logic(req)
      res.send(response)
    } catch (error) {
      console.error(error)
      res.statusCode = error.status ? error.status : 500
      res.json({ message: error.toString(), status: res.statusCode })
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
      throw new Error('Did not include user in request.')
    }
    if (!repoName) {
      throw new Error('Did not include repo name in request.')
    }
    if (req.user && req.user.username !== username) {
      throw new StatusError('Not Authorized', 401)
    }
    const service: UserService = new UserService(username, userServiceImpl)
    const blob = await service.getRepoAsArchive(repoName)
    const submission: Submission = new Submission({ blob })
    return submission
  }

  const getPublicURL = async (req: Request): Promise<{ url: URL }> => {
    const service: UserService = new UserService('NOT DEFINED', userServiceImpl)
    const url: URL = await service.getPublicURL()
    return { url }
  }

  const getUserInfo = async (req: Request): Promise<IUser> => {
    const username: string = req.params.user
    if (!username) {
      throw new Error('Did not include user in request.')
    }
    if (req.user && req.user.username !== username) {
      throw new StatusError('Not Authorized', 401)
    }
    const service: UserService = new UserService(username, userServiceImpl)
    const installationId: string = await service.getInstallationIdForUser()
    const repos: string[] = await service.getAvailableReposForUser()
    return new User({ username, installationId, repos: repos.map((repo: string) => ({ repoName: repo })) })
  }

  const getRepoArchiveLink = async (req: Request): Promise<{ url: URL }> => {
    const username: string = req.params.user
    const repoName: string = req.params.repo
    if (!username) {
      throw new Error('Did not include user in request.')
    }
    if (!repoName) {
      throw new Error('Did not include repo name in request.')
    }
    if (req.user && req.user.username !== username) {
      throw new StatusError('Not Authorized', 401)
    }
    const service: UserService = new UserService(username, userServiceImpl)
    return { url: await service.getArchiveLink(repoName) }
  }
  
  const hasUserInstalled = async (req: Request): Promise<{ installed: boolean }> => {
    const username: string = req.params.user
    if (!username) {
      throw new Error('Did not include user in request.')
    }

    let result: boolean = true
    try {
      await getUserInfo(req)
    } catch {
      result = false
    }

    return { installed: result }
  }

  const isLoggedIn = async (req: Request): Promise<{ authenticated: boolean }> => {
    let result: boolean = req.isAuthenticated()
    return { authenticated: result }
  }

  const ensureAuthenticated = (req: Request, res: Response, next: any) => {
    if (req.isAuthenticated()) { 
      return next()
    }

    // Set the return URL so we can come back to this request
    if(req.session) {
      req.session.returnTo = req.originalUrl
    }

    if (isLambda) {
      res.redirect(`${lambdaPrefix}/app/login`)
    } else {
      res.redirect('/app/login') 
    }
  }

  const router: Router = express.Router()

  passport.serializeUser((user, done) => {
    done(null, user)
  })

  passport.deserializeUser((obj, done) => {
    done(null, obj)
  })

  passport.use(new Strategy({
      clientID: clientId,
      clientSecret: clientSecret,
      callbackURL: isLambda ? `${lambdaPrefix}/app/auth/github/callback` : '/app/auth/github/callback'
    },
    function(accessToken: any, refreshToken: any, profile: any, done: any) {
      // asynchronous verification, for effect...
      process.nextTick(function () {
        return done(null, profile)
      })
    }
  ))

  router.use(cors())
  router.use(bodyParser.urlencoded({ extended: true }))
  router.use(bodyParser.json())
  router.use(methodOverride())
  router.use(session({ secret: 'maenad-coming-linesman', resave: false, saveUninitialized: false }))
  router.use(passport.initialize())
  router.use(passport.session())

  router.get('/login', (req: Request, res: Response) => {
    if (isLambda) {
      res.redirect(`${lambdaPrefix}/app/auth/github`)
    } else {
      res.redirect('/app/auth/github') 
    }
  })

  router.get('/auth/github',
    passport.authenticate('github', { scope: [ 'user:email' ] }),
    (req: Request, res: Response) => {
      // The request will be redirected to GitHub for authentication, so this
      // function will not be called.
    })

  router.get('/auth/github/callback', 
    passport.authenticate('github', { failureRedirect: isLambda ? `${lambdaPrefix}/app/login` : '/app/login' }),
    async (req: Request, res: Response) => {
      if(req.user) {
        // Check if the user has the app installed, if not, prompt them to install it
        req.params.user = req.user.username
        const data = await hasUserInstalled(req)
        const installed = data.installed

        if(!installed) {
          if (isLambda) {
            res.redirect('/dev/app/install')
          } else {
            res.redirect('/app/install') 
          }
        } else {
          // Take them back to their original request
          if(req.session && req.session.returnTo) {
            res.redirect(isLambda ? `${lambdaPrefix}${req.session.returnTo}` : req.session.returnTo)
          } else {
            res.send('OK')
          }
        }
      }
    })

  router.get('/logout', (req: Request, res: Response) => {
    req.logout()
    res.send('OK')
  })

  // API Endpoints
  // router.get('/repo/:user', ensureAuthenticated, wrapEndpoint(getUserInfo))
  // router.get('/repo/:user/:repo', ensureAuthenticated, wrapEndpoint(getRepoArchive))
  // router.get('/repo/:user/:repo/link', ensureAuthenticated, wrapEndpoint(getRepoArchiveLink))
  router.get('/repo/:user', wrapEndpoint(getUserInfo))
  router.get('/repo/:user/:repo', wrapEndpoint(getRepoArchive))
  router.get('/repo/:user/:repo/link', wrapEndpoint(getRepoArchiveLink))
  router.get('/install', redirectUser(getPublicURL))
  router.get('/installed/:user', wrapEndpoint(hasUserInstalled))
  router.get('/logged_in', wrapEndpoint(isLoggedIn))

  return router
}
