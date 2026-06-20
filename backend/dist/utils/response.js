"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendCreated = sendCreated;
exports.sendNoContent = sendNoContent;
exports.sendError = sendError;
exports.sendPaginated = sendPaginated;
function sendSuccess(res, data, statusCode = 200) {
    const body = { success: true, data };
    res.status(statusCode).json(body);
}
function sendCreated(res, data) {
    sendSuccess(res, data, 201);
}
function sendNoContent(res) {
    res.status(204).send();
}
function sendError(res, error, statusCode = 400, code) {
    const body = { success: false, error, code };
    res.status(statusCode).json(body);
}
function sendPaginated(res, data) {
    sendSuccess(res, data);
}
