"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskPhone = maskPhone;
exports.maskPlate = maskPlate;
function maskPhone(phone) {
    if (phone.length < 7)
        return phone;
    const prefix = phone.slice(0, 5);
    const suffix = phone.slice(-4);
    return `${prefix}***${suffix}`;
}
function maskPlate(plate) {
    if (plate.length < 5)
        return plate;
    const suffix = plate.slice(-5);
    return `**-${suffix}`;
}
