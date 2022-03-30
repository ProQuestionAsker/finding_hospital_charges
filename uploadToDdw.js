const fs = require('fs');
const needle = require('needle')
require('dotenv').config()

// https://data.world/ushealthcarepricing/preparing-for-dataset-upload/workspace/query?queryid=185fb2f9-fdea-487c-ba32-2afc2459783b
const queryToRun = '185fb2f9-fdea-487c-ba32-2afc2459783b'
const SLICE_NUMBER = 5


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
                .slice(0, SLICE_NUMBER)

        })
        .catch(err => `Error getting info from data.world ${err}`)

    return urls
            
}

function findFileName(url){
    console.log(url)
    const match = url.match(`(?:.+\/)([^#?]+)`)
    return match[1]
}

async function expandData(files){
    console.log(files.isArray)

    return files.map(d => {
        return {
            source: d,
            name: findFileName(d),
            labels: 'raw data'
        }
    })

}

async function writeToDDW(datasetid, path, filename){
    const agentid = 'ushealthcarepricing'

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
    `https://api.data.world/v0/datasets/${agentid}/${datasetid}/files`, fileData, fileOptions)
        .then(resp => console.log(resp.body, resp.statusCode, resp.headers))

}

(async function makeDatasets(){
    const hospitalData = await downloadHospitalInfo()

    const files = JSON.parse(hospitalData[0].files)
    console.log({files, arr: files.isArray})

    const expanded = await expandData(files)

    console.log(expanded)


})().catch(err => console.error(`Failed to make dataset: ${err}`))