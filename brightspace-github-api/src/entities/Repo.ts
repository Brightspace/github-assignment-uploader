import { IUser } from "./User"
import { IEntity } from "./Entity"

export interface IRepo {
    repoName: string
}

export class Repo implements IEntity, IRepo {
    public repoName: string

    constructor(repo: IRepo) {
        this.repoName = repo.repoName
        this.validate();
    }

    validate() {
        if (!this.repoName) {
            throw new Error("Repo name was not included for assignment.")
        }
    }
}