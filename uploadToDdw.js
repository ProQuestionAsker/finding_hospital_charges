const fs = require('fs');
const needle = require('needle');
const { join } = require('path');
require('dotenv').config()

// https://data.world/ushealthcarepricing/preparing-for-dataset-upload/workspace/query?queryid=185fb2f9-fdea-487c-ba32-2afc2459783b
const queryToRun = '185fb2f9-fdea-487c-ba32-2afc2459783b'
const SLICE_NUMBER = 53
const OWNER = 'ushealthcarepricing'

const failLogger = fs.createWriteStream('data/failedToUpload.json', {
    flags: 'a' // append to the file
})


async function downloadHospitalInfo(){
 

    const options = {
        headers: {
            'authorization': `Bearer ${process.env.DDW_TOKEN}`,
            'accept': 'application/json'
        }
    }

    const urls = needle('get', `https://api.data.world/v0/queries/${queryToRun}/results`, options)
        .then(resp => {

            return flatten = resp.body
                .slice(52, SLICE_NUMBER)

        })
        .catch(err => `Error getting info from data.world ${err}`)

    return urls
            
}

function findFileName(url){
    const match = url.match(`(?:.+\/)([^#?]+)`)
    return match[1]
}

async function expandData(files){
    const parsed = JSON.parse(files)

    return parsed.map(d => {
        return {
            source: {url: d},
            name: findFileName(d),
            labels: ['raw data']
        }
    })

}


function splitFoundUrls(urls){
    const arr = JSON.parse(urls)

    let formatted = [];

    arr.forEach(d => formatted.push(`* [${d}](${d})`))

    return formatted.join('\n ')
}

function unEscape(htmlStr) {
    htmlStr = htmlStr.replace(/&lt;/g , "<");	 
    htmlStr = htmlStr.replace(/&gt;/g , ">");     
    htmlStr = htmlStr.replace(/&quot;/g , "\"");  
    htmlStr = htmlStr.replace(/&#39;/g , "\'");   
    htmlStr = htmlStr.replace(/&amp;/g , "&");
    return htmlStr;
}

async function createNewDataset(data){
    const titleAdd = ' - Standard Charges'
    const titleAddLen = titleAdd.length
    const maxStringLength = 60 - titleAddLen
    const maxDescLength = 120

    const cleanName = unEscape(data.name) 
    const trimmedName = cleanName.substring(0, maxStringLength)

    const title = `${trimmedName} - Standard Charges`
    const description = `Prices of common procedures at ${data.name} as reported by the hospital`.substring(0, maxDescLength)
    const license = 'Public Domain'
    const tags = ['hospital', 'pricing', 'price', 'standard charges']
    const visibility = 'OPEN'
    const summary = `## About: 
This dataset contains the machine readable hospital pricing information from ${data.name}. These files are accessible on their [website](${data.originalurl}).

## Collecting the data:
In an effort to abide by the Centers for Medicare and Medicaid Services IPPS Final Rule requiring hospitals to make a machine readable listing of standard hospital charges available online, ${data.name} provided downloads of these data directly on their website. The files were found at
${splitFoundUrls(data.foundat)}

All data was collected programmatically, using a custom script written in Node.js and utilizing [Microsoft Playwright](https://playwright.dev/). Data was programmatically mirrored on the data.world platform using the "[Import from URL](https://docs.data.world/en/64499-64805-1--How-to-get-your-data-into-data-world.html#UUID-32bb2562-b74c-2eeb-97a3-e285a7867e9c)" option.

## See an error?
As mentioned above, these data were found and uploaded programmatically by members of the data.world team in an effort to consolidate pricing information from hospitals across the US. If you've spotted an error, leave us a note in the Discussion tab of this dataset, or reach out to us at [support@data.world](mailto:support@data.world).` 

    const expanded = await expandData(data.files)

    return {title, description, license,  tags, visibility, summary, files: expanded}
}

async function writeToDDW(fileData){

    let status;
    
    const fileOptions = {
        headers: {
            'authorization': `Bearer ${process.env.DDW_TOKEN}`,
            'Content-Type': 'application/json'
        }
    }

    return needle('post', 
    `https://api.data.world/v0/datasets/${OWNER}`, fileData, fileOptions)
        .then(resp => {
            
            console.log(resp.body, resp.statusCode, resp.headers)
            return resp.statusCode
        })


}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async function makeDatasets(){
    const hospitalData = await downloadHospitalInfo()
        .catch(err => console.error(`Failed to download info: ${err}`))

    for  (const hospital of hospitalData){

        // sleep for one second between dataset creation
        await sleep(1000)

        const meta = await createNewDataset(hospital)
            .catch(err => console.error(`Failed to create new dataset: ${err}`))

         
        const status = await writeToDDW(meta)
        console.log({status})

        // if upload wasn't successful, log that information
        if (status !== 200){
            failLogger.write(JSON.stringify(hospital))
        }

    }


})().catch(err => console.error(`Failed to make dataset: ${err}`))