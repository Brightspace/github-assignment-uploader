export class Submission {
    constructor(private submission: {
        srcObject: any
    }) {
        if (!submission.srcObject()) {
            throw new Error("Source object was not included for submission.");
        }
    }

    public getSrcObject(): any {
        return this.submission.srcObject;
    }
}