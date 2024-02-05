const DEFAULT = require('./consts');

function extract(src, lineNumber, variants = DEFAULT.variants) {

    function is(line, target) {
        let str = line.trim()
        return str.toUpperCase() === target.toUpperCase();
    }

    let lines = src.split('\n')
    let begin = null
    let end = null
    let lang = null

    function fenceOpeningWithKey(line) {
        for (var key of Object.keys(variants)) {
            if (is(line, '```' + key)) {
                return key
            }
        }
        return null
    }


    for (let i = lineNumber; i >= 0; i--) {

        let key = fenceOpeningWithKey(lines[i])
        if (key) {
            begin = i;
            lang = key
            break
        } else if (i !== lineNumber && is(lines[i], '```')) {
            begin = null
            lang = null
            break
        }
    }

    for (let i = lineNumber; i < lines.length; i++) {
        if (i !== begin && is(lines[i], '```')) {
            end = i;
            break
        }
    }

    if ((begin != null) && (end != null)) {
        return {
            lang: lang,
            text: lines.slice(begin + 1, end).join('\n'),
            begin: begin,
            end: end,
        };
    }
    return null

}

module.exports = extract
