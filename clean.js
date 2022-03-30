const fs = require('fs');
const needle = require('needle')
require('dotenv').config()

let totalLinks = 0;

const foundLogger = fs.createWriteStream('data/links.json')


function cleanFileUrls(files){
    const fileTypes = ['.xls', '.csv', '.json', '.ashx', '.txt', '.zip']
    const filtered = files
        .filter(d => !d.includes('Captcha'))
        .filter(d => fileTypes.some(e => d.includes(e)))

    const noDupes = [...new Set(filtered)]

    totalLinks += noDupes.length

    return noDupes
}

async function writeToDDW(path, filename){
    const agentid = 'ushealthcarepricing'
    const datasetid = 'location-of-standard-charge-files'

    const fileData = {
        file: {
            file: path,
            content_type: 'application/json',
            filename
        }
    }
    
    const fileOptions = {
        headers: {
            'authorization': `Bearer ${process.env.DDW_TOKEN}`
        },
        multipart: true
    }

    needle('post', 
    `https://api.data.world/v0/uploads/${agentid}/${datasetid}/files`, fileData, fileOptions)
        .then(resp => console.log(resp.body, resp.statusCode, resp.headers))

}

(async function cleanData(){
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
    
        // write cleaned data locally
        foundLogger.write(str)
    
        // write cleaned data to data.world
        await writeToDDW('data/links.json', 'links.json')
    
    }
    catch (err){
        console.error(err)
    }
})().catch(error => console.error(`Error cleaning: ${error}`))










