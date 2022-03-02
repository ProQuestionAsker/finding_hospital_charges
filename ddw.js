const fs = require('fs');
require('dotenv').config()
const http = require('http');
const needle = require('needle')
const express = require('express');
const FormData = require('form-data');
const { application } = require('express');
const PORT = 8080;

const agentid = 'amberthomas'
const datasetid = 'location-of-price-transparency-data'
const filename = 'links.json'

const file = fs.readFileSync('data/links.json', 'utf-8')

const form = new FormData()
form.append('file', file)


async function downloadHospitalUrls(){

    const options = {
        headers: {
            'authorization': `Bearer ${process.env.DDW_TOKEN}`,
            'accept': 'application/json'
        }
    }

    needle.get('https://api.data.world/v0/queries/07c801a1-9a0a-4cc6-9a72-39bb615472eb/results', options, (err, resp) => {
        if (err) console.error(err)
    console.log(resp.body)
})
}

downloadHospitalUrls()

const ctype = form.getHeaders()['content-type']


const fileData = {
    file: {
        file: 'data/links.json',
        content_type: 'application/json',
        filename: 'links.json'
    }
}

const fileOptions = {
    headers: {
        'authorization': `Bearer ${process.env.DDW_TOKEN}`
    },
    multipart: true
}


function uploadFile(){

    needle('post', 
    `https://api.data.world/v0/uploads/${agentid}/${datasetid}/files`, fileData, fileOptions)
        .then(resp => console.log(resp.body, resp.statusCode, resp.headers))


 

}

// uploadFile()


// const form = new formData()


// form.append('file', fs.createReadStream('data/links.json'))

    // const req = http.request({
    //     host: 'api.data.world',
    //     method: 'post',
    //     path: 'https://api.data.world/uploads/${agentid}/${datasetid}/files',
    //     auth: `Bearer ${process.env.DDW_TOKEN}`, 
    //     headers: form.getHeaders()
    // })
    // console.log({req})

    // form.pipe(req)

    // req.on('response', (res, err) => {
    //     if (err) console.error(`Error: ${err}`)
    //     console.log(res.statusCode)
    // })

    // form.submit({
    //     host: 'api.data.world',
    //     method: 'POST',
    //     path: `/v0/uploads/${agentid}/${datasetid}/files`,
    //     auth: `Bearer ${process.env.DDW_TOKEN}`,
    //     headers: {
    //         'authorization': `Bearer ${process.env.DDW_TOKEN}`,
    //         'content-type': 'multipart/form-data',
    //     }
    // }, (err, res) => {
    //     if(err) console.log({err})
    //     console.log(res.statusCode, res.body, res.headers)
    // })
        // const { data } = await application.post(
        //     `/uploads/${agentid}/${datasetid}/files`,
        //     form,
        //     {
        //         headers: {
        //             ...form.getHeaders(),

        //         }
        //     }
        // )
        //console.log(data)




const data = {
    title: 'Location of Price Transparency Data',
    description: 'The URLs of price transparency data on hospitals throughout the US',
    visibility: 'PRIVATE'
}


const options = {
    headers: {
        'authorization': `Bearer ${process.env.DDW_TOKEN}`,
        'content-type': 'application/json'
    }
}

// const fileData = {
//     file: 'data/links.json',
//     content_type: 'application/json'
// }

// const fileOptions = {
//     headers: {
//         'authorization': `Bearer ${process.env.DDW_TOKEN}`,
//         'content-type': 'multipart/form-data',
//         'content-disposition': 'form-data; filename="links.json"'
//     },
//     multipart: true
// }


// function uploadFile(){
//     needle('post', 
//     'https://api.data.world/v0/uploads/amberthomas/location-of-price-transparency-data/files', fileData, fileOptions)
//         .then(resp => console.log(resp.body, resp.statusCode, resp.headers))
// }

//uploadFile()


// needle('post', 'https://api.data.world/v0/datasets/amberthomas', data, options)
//     .then(resp => console.log(resp.body, resp.statusCode))
//     .then(uploadFile)
//     //.then(data => console.log({data}))
//     .catch((err) => console.error(err))

// needle.get('http://api.data.world/v0/datasets/amberthomas/datasets/own', options, (err, resp) => {
//     if (err) console.error(err)
//     console.log({resp})
// })


// https.get('http://api.data.world/v0/datasets/amberthomas/age-of-characters-and-actors-in-teen-tv-shows', (resp) => {
//     let data = '';

//     resp.on('data', (chunk) => {
//         data += chunk;
//     });

//     resp.on('end', () => {
//         console.log(JSON.parse(data))
//     })
// }).on('error', (err) => {
//     console.error(`Error: ${err}`)
// })







// const files = fs.readFileSync('../../dwApiNode/README.md', 'utf-8')


// console.log({files})



// function sendToDdw(){
//     const links = fs.readFileSync('data/links.json', 'utf-8')
//     const {DDW_TOKEN} = process.env

//     const test = ddw.getDataset('amberthomas', 'age-of-characters-and-actors-in-teen-tv-shows')
//     console.log({test})
// }

// sendToDdw()



