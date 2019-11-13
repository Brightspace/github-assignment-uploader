exports.validate = (obj, schema) => {
    const validation = schema.validate(obj)
    if (validation.error) {
        throw new Error("INVALID SCHEMA: " + JSON.stringify(validation.error.details))
    }
}