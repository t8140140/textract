const { spawn } = require("child_process");
const { exec } = require("child_process");
const os = require("os");
const path = require("path");

let types;

// textutil -convert txt -stdout foo.doc
function extractText(filePath, options, cb) {
    let result = "";
    let error = null;
    const textutil = spawn("textutil", ["-convert", "txt", "-stdout", filePath]);
    textutil.stdout.on("data", function (buffer) {
        result += buffer.toString();
    });

    textutil.stderr.on("error", function (buffer) {
        if (!error) {
            error = "";
        }
        error += buffer.toString();
    });

    textutil.on("close", function (/* code */) {
        if (error) {
            error = new Error(`textutil read of file named [[ ${path.basename(filePath)} ]] failed: ${error}`);
            cb(error, null);
            return;
        }
        cb(null, result.trim());
    });
}

function testForBinary(options, cb) {
    // just osx extractor, so don't bother checking on osx
    if (os.platform() !== "darwin") {
        cb(true);
        return;
    }

    exec(`textutil ${__filename}`, function (error /* , stdout, stderr */) {
        let msg;
        if (error !== null) {
            msg = "INFO: 'textutil' does not appear to be installed, " + "so textract will be unable to extract DOCs.";
        }
        cb(error === null, msg);
    });
}

types = os.platform() === "darwin" ? ["application/msword", "application/rtf", "text/rtf"] : [];

module.exports = {
    types,
    extract: extractText,
    test: testForBinary,
};
