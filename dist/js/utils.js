"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimestampString = void 0;
function getTimestampString() {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();
    const hour = currentDate.getHours();
    const min = currentDate.getMinutes();
    const sec = currentDate.getSeconds();
    return String(year) +
        String(month).padStart(2, "0") +
        String(day).padStart(2, "0") +
        String(hour).padStart(2, "0") +
        String(min).padStart(2, "0") +
        String(sec).padStart(2, "0");
}
exports.getTimestampString = getTimestampString;
