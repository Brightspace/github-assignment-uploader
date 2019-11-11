import { IUser } from "../entities/User";

export interface IUserService {
    getInstallationId: (username: string) => string
    listRepos: (username: string) => string[]
    getArchive: (username: string, repoName: string) => Uint8Array
    getPublicURL: () => URL
}

export class UserService {
    constructor(private username: string, private impl: IUserService) {}

    getInstallationIdForUser(): string {
        return this.impl.getInstallationId(this.username)
    }

    getAvailableReposForUser(): string[] {
        return this.impl.listRepos(this.username)
    }

    getRepoAsArchive(repoName: string): Uint8Array {
        return this.impl.getArchive(this.username, repoName);
    }

    getPublicURL(): URL {
        return this.impl.getPublicURL();
    }
}