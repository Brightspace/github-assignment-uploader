import { IEntity } from "./Entity"
import { IRepo } from "./Repo"

export interface IUser {
    username: string,
    installationId: string,
    repos: IRepo[]
}

export class User implements IEntity, IUser {
    public username: string
    public installationId: string
    public repos: IRepo[]
    
    constructor(user: IUser) {
        this.username = user.username
        this.installationId = user.installationId
        this.repos = user.repos;
        this.validate();
    }

    public addRepo(repo: IRepo) {
        this.repos.push(repo)
    }

    public validate() {
        if (!this.username) {
            throw new Error("Username was not included.")
        }
        if (!this.installationId) {
            throw new Error("Installation ID was not included.")
        }
    }
}