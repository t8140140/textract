/* eslint-disable max-len */

const fs = require("fs");
const cheerio = require("cheerio");

function getTextWithAlt($, $element) {
    if (!$element) {
        return "";
    }

    if ($element.is("img")) {
        return ` ${$element.attr("alt")} `;
    }

    if ($element.is("input")) {
        return $element.attr("value");
    }

    return $element
        .contents()
        .map(function (i, domElement) {
            let returnText;
            if (domElement.nodeType === 3) {
                returnText = domElement.data;
            } else if (domElement.nodeType === 1) {
                $element = $(domElement);
                returnText =
                    $element.is("img, input") || $element.find("img[alt], input[value]").length > 0
                        ? getTextWithAlt($, $element)
                        : $element.text();
            }
            return returnText;
        })
        .get()
        .join("");
}

function extractFromText(data, options, cb) {
    let $;
    let text;

    text = data
        .toString()
        .replace(
            /< *(br|p|div|section|aside|button|header|footer|li|article|blockquote|cite|code|h1|h2|h3|h4|h5|h6|legend|nav)((.*?)>)/g,
            "<$1$2|||||"
        )
        .replace(/< *\/(td|a|option) *>/g, " </$1>") // spacing some things out so text doesn't get smashed together
        .replace(/< *(a|td|option)/g, " <$1") // spacing out links
        .replace(/< *(br|hr) +\/>/g, "|||||<$1\\>")
        .replace(
            /<\/ +?(p|div|section|aside|button|header|footer|li|article|blockquote|cite|code|h1|h2|h3|h4|h5|h6|legend|nav)>/g,
            "|||||</$1>"
        );

    text = `<textractwrapper>${text}<textractwrapper>`;

    try {
        $ = cheerio.load(text);
        $("script").remove();
        $("style").remove();
        $("noscript").remove();

        const $docElement = $("textractwrapper");

        text = options.includeAltText ? getTextWithAlt($, $docElement) : $docElement.text();

        text = text
            .replace(/\|{5}/g, "\n")
            .replace(/(\n\u00A0|\u00A0\n|\n | \n)+/g, "\n")
            .replace(/(\r\u00A0|\u00A0\r|\r | \r)+/g, "\n")
            .replace(/(\v\u00A0|\u00A0\v|\v | \v)+/g, "\n")
            .replace(/(\t\u00A0|\u00A0\t|\t | \t)+/g, "\n")
            .replace(/[\t\n\v\r]+/g, "\n");
    } catch (error) {
        cb(error, null);
        return;
    }

    cb(null, text);
}

function extractText(filePath, options, cb) {
    fs.readFile(filePath, function (error, data) {
        if (error) {
            cb(error, null);
            return;
        }
        extractFromText(data, options, cb);
    });
}

module.exports = {
    types: ["text/html", "text/xml", "application/xml", "application/rss+xml", "application/atom+xml"],
    extract: extractText,
    extractFromText,
};
