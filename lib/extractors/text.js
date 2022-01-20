const fs = require("fs");
const path = require("path");
const iconv = require("iconv-lite");
const jschardet = require("jschardet");

function extractText(filePath, options, cb) {
    fs.readFile(filePath, function (error, data) {
        let encoding;
        let decoded;
        let detectedEncoding;
        if (error) {
            cb(error, null);
            return;
        }
        try {
            detectedEncoding = jschardet.detect(data).encoding;
            if (!detectedEncoding) {
                error = new Error(`Could not detect encoding for file named [[ ${path.basename(filePath)} ]]`);
                cb(error, null);
                return;
            }
            encoding = detectedEncoding.toLowerCase();

            decoded = iconv.decode(data, encoding);
        } catch (error_) {
            cb(error_);
            return;
        }
        cb(null, decoded);
    });
}

module.exports = {
    types: [/text\//, "application/csv", "application/javascript"],
    extract: extractText,
};
