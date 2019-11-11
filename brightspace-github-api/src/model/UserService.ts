import { IUser } from "../entities/User";

export interface IUserService {
    getInstallationId: (username: string) => Promise<string>
    listRepos: (username: string) => Promise<string[]>
    getArchive: (username: string, repoName: string) => Promise<Uint8Array>
    getPublicURL: () => Promise<URL>
}

export class UserService {
    constructor(private username: string, private impl: IUserService) {}

    async getInstallationIdForUser(): Promise<string> {
        return await this.impl.getInstallationId(this.username)
    }

    async getAvailableReposForUser(): Promise<string[]> {
        return await this.impl.listRepos(this.username)
    }

    async getRepoAsArchive(repoName: string): Promise<Uint8Array> {
        return await this.impl.getArchive(this.username, repoName);
    }

    async getPublicURL(): Promise<URL> {
        return await this.impl.getPublicURL();
    }
}