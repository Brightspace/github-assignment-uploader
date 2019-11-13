import { IEntity } from "./Entity";

export interface ISubmission {
    blob: Uint8Array
}

export class Submission implements IEntity, ISubmission {
    public blob: Uint8Array

    constructor(submission: ISubmission) {
        this.blob = submission.blob
        this.validate()
    }

    public validate() {
        if (!this.blob) {
            throw new Error("Source object was not included for submission.");
        }
    }
}