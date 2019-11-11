import { IUserService } from "../model/UserService";
import { IUser } from "../entities/User";

export class UserServiceStub implements IUserService {
    public getInstallationId(username: string): string {
        return "f98hf9whg8r9whg0wegh";
    }

    public listRepos(username: string): string[] {
        return [
            "repo1",
            "repo2",
            "repo3",
            "repo4",
        ]
    }

    public getArchive(username: string, repoName: string): Uint8Array {
        return new Uint8Array(new ArrayBuffer(8));
    }

    public getPublicURL(): URL {
        return new URL("https://google.ca")
    }
}