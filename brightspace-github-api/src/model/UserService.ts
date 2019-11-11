import { IUser } from "../entities/User";

export interface IUserService {
    getInstallationId: (username: string) => string
    listRepos: (username: string) => string[]
}

export class UserService {
    constructor(private username: string, private impl: IUserService) {}

    getInstallationIdForUser(): string {
        return this.impl.getInstallationId(this.username)
    }

    getAvailableReposForUser(): string[] {
        return this.impl.listRepos(this.username)
    }
}