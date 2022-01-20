const fs = require("fs");
const path = require("path");
const { decode } = require("html-entities");
const util = require("./util");

const extractorPath = path.join(__dirname, "extractors");
const entitiesDecode = decode;
const typeExtractors = {};
const regexExtractors = [];
const failedExtractorTypes = {};
let totalExtractors = 0;
let satisfiedExtractors = 0;
let hasInitialized = false;
const STRIP_ONLY_SINGLE_LINEBREAKS = /(^|[^\n])\n(?!\n)/g;
const WHITELIST_PRESERVE_LINEBREAKS =
    /[^\d\n\r !"#$%&'-\w'()-_`a-z{|}~\u0080-\u1FFF\u2013–\u2014\u2015\u2018\u2019\u201C\u201D„\u2026\u20AC\u2116\u2C00-\uD7FF\uFB50\uFDFF\uFE70\uFEFF\uFF01-\uFFE6]*/g; // eslint-disable-line max-len
const WHITELIST_STRIP_LINEBREAKS =
    /[^\d !"#$%&'-\w'()-_`a-z{|}~\u0080-\u1FFF\u2013–\u2014\u2015\u2018\u2019\u201C\u201D„\u2026\u20AC\u2116\u2C00-\uD7FF\uFB50\uFDFF\uFE70\uFEFF\uFF01-\uFFE6]*/g;
// eslint-disable-line max-len
function registerExtractor(extractor) {
    if (extractor.types) {
        for (let type of extractor.types) {
            if (typeof type === "string") {
                type = type.toLowerCase();
                typeExtractors[type] = extractor.extract;
            } else if (type instanceof RegExp) {
                regexExtractors.push({ reg: type, extractor: extractor.extract });
            }
        }
    }
}

function registerFailedExtractor(extractor, failedMessage) {
    if (extractor.types) {
        for (const type of extractor.types) {
            failedExtractorTypes[type.toLowerCase()] = failedMessage;
        }
    }
}

function testExtractor(extractor, options) {
    extractor.test(options, function (passedTest, failedMessage) {
        satisfiedExtractors++;
        if (passedTest) {
            registerExtractor(extractor);
        } else {
            registerFailedExtractor(extractor, failedMessage);
        }
    });
}

// global, all file type, content cleansing
function cleanseText(options, cb) {
    return function (error, text) {
        if (!error) {
            // clean up text
            text = util.replaceBadCharacters(text);

            if (options.preserveLineBreaks || options.preserveOnlyMultipleLineBreaks) {
                if (options.preserveOnlyMultipleLineBreaks) {
                    text = text.replace(STRIP_ONLY_SINGLE_LINEBREAKS, "$1 ").trim();
                }
                text = text.replace(WHITELIST_PRESERVE_LINEBREAKS, " ");
            } else {
                text = text.replace(WHITELIST_STRIP_LINEBREAKS, " ");
            }

            // multiple spaces, tabs, vertical tabs, non-breaking space]
            text = text.replace(/ (?! )/g, "").replace(/[\t\v \u00A0]{2,}/g, " ");

            text = entitiesDecode(text, { level: "xml" });
        }
        cb(error, text);
    };
}

function initializeExtractors(options) {
    let extractors;

    hasInitialized = true;

    // discover available extractors
    extractors = fs.readdirSync(extractorPath).map(function (item) {
        const fullExtractorPath = path.join(extractorPath, item);
        // get the extractor
        // eslint-disable-next-line global-require
        return require(fullExtractorPath);
    });

    // perform any binary tests to ensure extractor is possible
    // given execution environment
    for (const extractor of extractors) {
        if (extractor.test) {
            testExtractor(extractor, options);
        } else {
            satisfiedExtractors++;
            registerExtractor(extractor);
        }
    }

    // need to keep track of how many extractors we have in total
    totalExtractors = extractors.length;
}

function findExtractor(type) {
    let i;
    const iLen = regexExtractors.length;
    let extractor;
    let regexExtractor;

    type = type.toLowerCase();
    if (typeExtractors[type]) {
        extractor = typeExtractors[type];
    } else {
        for (i = 0; i < iLen; i++) {
            regexExtractor = regexExtractors[i];
            if (regexExtractor.reg.test(type)) {
                extractor = regexExtractor.extractor;
            }
        }
    }
    return extractor;
}

function extract(type, filePath, options, cb) {
    let error;
    let msg;
    let theExtractor;

    if (!hasInitialized) {
        initializeExtractors(options);
    }

    // registration of extractors complete?
    if (totalExtractors === satisfiedExtractors) {
        theExtractor = findExtractor(type);

        if (theExtractor) {
            cb = cleanseText(options, cb);
            theExtractor(filePath, options, cb);
        } else {
            // cannot extract this file type
            msg = `Error for type: [[ ${type} ]], file: [[ ${filePath} ]]`;

            // update error message if type is supported but just not configured/installed properly
            if (failedExtractorTypes[type]) {
                msg +=
                    `, extractor for type exists, but failed to initialize.` +
                    ` Message: ${failedExtractorTypes[type]}`;
            }

            error = new Error(msg);
            error.typeNotFound = true;
            cb(error, null);
        }
    } else {
        // async registration has not wrapped up
        // try again later
        setTimeout(function () {
            extract(type, filePath, options, cb);
        }, 100);
    }
}

module.exports = extract;
