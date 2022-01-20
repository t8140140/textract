const path = require("path");
const xlsx = require("xlsx");

function extractText(filePath, options, cb) {
    const CSVs = {};
    let wb;
    let result;
    let error;
    let sheet;

    try {
        wb = xlsx.readFile(filePath);
        for (const key of Object.keys(wb.Sheets)) {
            sheet = wb.Sheets[key];
            CSVs[key] = xlsx.utils.sheet_to_csv(sheet);
        }
    } catch (error_) {
        error = new Error(`Could not extract ${path.basename(filePath)}, ${error_}`);
        cb(error, null);
        return;
    }

    result = "";
    for (const key of Object.keys(CSVs)) {
        result += CSVs[key];
    }

    cb(null, result);
}

module.exports = {
    types: [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
        "application/vnd.ms-excel.sheet.macroEnabled.12",
        "application/vnd.oasis.opendocument.spreadsheet",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
        "application/vnd.oasis.opendocument.spreadsheet-template",
    ],
    extract: extractText,
};
