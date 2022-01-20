const { exec } = require("child_process");
const os = require("os");
const path = require("path");
const util = require("../util");

let types;

function extractText(filePath, options, cb) {
    const execOptions = util.createExecOptions("doc", options);

    exec(`antiword -m UTF-8.txt "${filePath}"`, execOptions, function (error, stdout /* , stderr */) {
        let err;
        if (error) {
            err =
                error.toString().indexOf("is not a Word Document") > 0
                    ? new Error(`file named [[ ${path.basename(filePath)} ]] does not appear to really be a .doc file`)
                    : new Error(`antiword read of file named [[ ${path.basename(filePath)} ]] failed: ${error}`);
            cb(err, null);
        } else {
            cb(null, stdout.trim().replace(/\[pic]/g, ""));
        }
    });
}

function testForBinary(options, cb) {
    let execOptions;

    // just non-osx extractor
    if (os.platform() === "darwin") {
        cb(true);
        return;
    }

    execOptions = util.createExecOptions("doc", options);

    exec(`antiword -m UTF-8.txt ${__filename}`, execOptions, function (error /* , stdout, stderr */) {
        let msg;
        if (error !== null && error.message && error.message.includes("not found")) {
            msg = "INFO: 'antiword' does not appear to be installed, " + "so textract will be unable to extract DOCs.";
            cb(false, msg);
        } else {
            cb(true);
        }
    });
}

types = os.platform() === "darwin" ? [] : ["application/msword"];

module.exports = {
    types,
    extract: extractText,
    test: testForBinary,
};
