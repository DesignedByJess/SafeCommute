"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
const errors_1 = require("../utils/errors");
function validate(schema, source = 'body') {
    return (req, _res, next) => {
        try {
            const data = schema.parse(req[source]);
            req[source] = data;
            next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
                return next(new errors_1.ValidationError(message));
            }
            next(err);
        }
    };
}
