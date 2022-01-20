const path = require("path");
const textract = require("./index");

module.exports = function (filePath, flags) {
    filePath = path.resolve(process.cwd(), filePath);

    flags.preserveLineBreaks = flags.preserveLineBreaks !== "false";

    textract.fromFileWithPath(filePath, flags, function (error, text) {
        if (error) {
            // eslint-disable-next-line no-console
            console.error(error);
        } else {
            // eslint-disable-next-line no-console
            console.log(text);
        }
    });
};
