const xpath = require("xpath");
const Dom = require("@xmldom/xmldom").DOMParser;
const yauzl = require("yauzl");
const util = require("../util");

const includeRegex = /.xml$/;
const excludeRegex = /^(word\/media\/|word\/_rels\/)/;

function _calculateExtractedText(inText, preserveLineBreaks) {
    const doc = new Dom().parseFromString(inText);
    const ps = xpath.select("//*[local-name()='p']", doc);
    let text = "";
    for (let paragraph of ps) {
        var ts;
        let localText = "";
        paragraph = new Dom().parseFromString(paragraph.toString());
        ts = xpath.select("//*[local-name()='t' or local-name()='tab' or local-name()='br']", paragraph);
        for (const t of ts) {
            if (t.localName === "t" && t.childNodes.length > 0) {
                localText += t.childNodes[0].data;
            } else if (t.localName === "tab") {
                localText += " ";
            } else if (t.localName === "br") {
                localText += preserveLineBreaks !== true ? " " : "\n";
            }
        }
        text += `${localText}\n`;
    }

    return text;
}

function extractText(filePath, options, cb) {
    let result = "";

    yauzl.open(filePath, function (err, zipfile) {
        let processEnd;
        let processedEntries = 0;
        if (err) {
            util.yauzlError(err, cb);
            return;
        }

        processEnd = function () {
            let text;
            if (zipfile.entryCount === ++processedEntries) {
                if (result.length > 0) {
                    text = _calculateExtractedText(result, options.preserveLineBreaks);
                    cb(null, text);
                } else {
                    cb(
                        new Error(
                            "Extraction could not find content in file, are you" +
                                " sure it is the mime type it says it is?"
                        ),
                        null
                    );
                }
            }
        };

        zipfile.on("entry", function (entry) {
            if (includeRegex.test(entry.fileName) && !excludeRegex.test(entry.fileName)) {
                util.getTextFromZipFile(zipfile, entry, function (err2, text) {
                    result += `${text}\n`;
                    processEnd();
                });
            } else {
                processEnd();
            }
        });

        zipfile.on("error", function (err3) {
            cb(err3);
        });
    });
}

module.exports = {
    types: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    extract: extractText,
};
