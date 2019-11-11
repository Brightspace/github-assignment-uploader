import { IUserService } from "../model/UserService";
import { IUser } from "../entities/User";

export class UserServiceStub implements IUserService {
    public async getInstallationId(username: string): Promise<string> {
        return "f98hf9whg8r9whg0wegh";
    }

    public async listRepos(username: string): Promise<string[]> {
        return [
            "repo1",
            "repo2",
            "repo3",
            "repo4",
        ]
    }

    public async getArchive(username: string, repoName: string): Promise<Uint8Array> {
        return new Uint8Array(new ArrayBuffer(8));
    }

    public async getPublicURL(): Promise<URL> {
        return new URL("https://google.ca")
    }
}