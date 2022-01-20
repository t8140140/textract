const xpath = require("xpath");
const Dom = require("@xmldom/xmldom").DOMParser;
const yauzl = require("yauzl");
const util = require("../util");

const slideMatch = /^ppt\/slides\/slide/;
const noteMatch = /^ppt\/notesSlides\/notesSlide/;

function _compareSlides(a, b) {
    if (a.slide < b.slide) {
        return -1;
    }
    if (a.slide > b.slide) {
        return 1;
    }
    return 0;
}

function _calculateExtractedText(slideText) {
    const doc = new Dom().parseFromString(slideText);
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
            } else if (t.localName === "tab" || t.localName === "br") {
                localText += "";
            }
        }
        text += `${localText}\n`;
    }

    return text;
}

function extractText(filePath, options, cb) {
    const slides = [];

    yauzl.open(filePath, function (err, zipfile) {
        if (err) {
            util.yauzlError(err, cb);
            return;
        }

        zipfile.on("end", function () {
            let slidesText;
            let text;
            if (slides.length > 0) {
                slides.sort(_compareSlides);
                slidesText = slides
                    .map(function (slide) {
                        return slide.text;
                    })
                    .join("\n");
                text = _calculateExtractedText(slidesText);
                cb(null, text);
            } else {
                cb(
                    new Error(
                        "Extraction could not find slides in file, are you" + " sure it is the mime type it says it is?"
                    ),
                    null
                );
            }
        });

        zipfile.on("entry", function (entry) {
            if (slideMatch.test(entry.fileName) || noteMatch.test(entry.fileName)) {
                util.getTextFromZipFile(zipfile, entry, function (err2, text) {
                    const slide = +entry.fileName.replace("ppt/slides/slide", "").replace(".xml", "");
                    slides.push({ slide, text });
                });
            }
        });

        zipfile.on("error", function (err3) {
            cb(err3);
        });
    });
}

module.exports = {
    types: [
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.openxmlformats-officedocument.presentationml.template",
    ],
    extract: extractText,
};
