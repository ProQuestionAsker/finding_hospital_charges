const fs = require('fs');

try {
    // read file
    const data = fs.readFileSync('data/links.json', 'utf-8')

    const parsed  = JSON.parse(data)

    // clean data
    const cleaned = parsed.map(d => ({
        ...d,
        files: cleanFileUrls(d.files)
    })).filter(d => d.files.length)

    const str = JSON.stringify(cleaned)

    foundLogger.write(str)

}
catch (err){
    console.error(err)
}