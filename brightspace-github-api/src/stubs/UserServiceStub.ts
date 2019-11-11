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
}