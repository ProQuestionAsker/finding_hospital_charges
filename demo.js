const { chromium } = require('playwright');
const fs = require('fs');
const needle = require('needle')
require('dotenv').config()


let page;

const words = ['pric', 'cms', 'estimat', 'charg', 'pay', 'machine read', 'financ', 'bill']
const fileTypes = ['xls', 'csv', 'json', 'ashx', 'txt', 'zip']

let allFileUrls = [];
let allCheckedUrls = [];
let thisCheckedUrls = 0;
let MAX_TO_CHECK = 50
let bestGuesses = [];
let SLICE_NUMBER = 40;
let BACKUP = 50;

// all hospital urls from wikidata
const allHospitalQuery = '07c801a1-9a0a-4cc6-9a72-39bb615472eb'

// only hospitals that we've already checked but have returned a "best guess" url of where the files may be
const bestGuessHospitalQuery = 'd719ee80-3677-47ef-b458-545813bc8088'

const queryToRun = bestGuessHospitalQuery


// // create write streams for exporting data
// const foundLogger = fs.createWriteStream('data/links2.json', {
//     flags: 'a' // append to the file
// })

// const missingLogger = fs.createWriteStream('data/missingLinks2.json', {
//     flags: 'a' // append to the file
// })

async function downloadHospitalUrls(){
 

    const options = {
        headers: {
            'authorization': `Bearer ${process.env.DDW_TOKEN}`,
            'accept': 'application/json'
        }
    }

    const urls = needle('get', `https://api.data.world/v0/queries/${queryToRun}/results`, options)
        .then(resp => {

            return flatten = resp.body
                .map(d => d.searchUrl)
                //.slice(20, SLICE_NUMBER)

        })
        .catch(err => `Error getting urls from data.world ${err}`)

    return urls
            
}


// list of test hospitalURLs
const hospitalURLs = [ 'https://www.mayoclinic.org/', 'http://www.christushealth.org', 'http://www.massgeneral.org/international']


async function getDomain(url){
    const match = url.match(`^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)`)
    return domain = match[0]
}

async function checkDomain(url){

    // navigate to page
    await page.goto(url, {timeout: 7000, waitUntil: 'domcontentloaded'})

    // check to see if URL redirected
    const redirectedUrl = await page.url()

    // extract domain and subdomain
    const domain = await getDomain(redirectedUrl)

    // check if url and domain are the same
    const urlIsDomain = url === domain

    // check if domain is already in list
    const alreadyInList = hospitalURLs.includes(domain)

    // return a boolean stating whether the url is already in the list and whether it's the domain itself
    return !(alreadyInList && !urlIsDomain)

}
async function checkPageForText(text){

    // find a elements with specified text string in displayed text or url
    const elements = await page.locator(`a:has-text('${text}')`, `a[href*=${text}]`)

    // collect URLs for all of those links
    const linkUrls = await elements.evaluateAll(links => {
        return links.map(link => {
            return link.href
        })
    }).catch(error => console.error({error}))

    // return unique URLs with a text match for "text" string
    return [...new Set(linkUrls)]
}


async function checkForAllFiles(){
    let allFoundFiles = [];

    for await (type of fileTypes) {
        // find all link elements with file type
        const aElements = page.locator(`a[href*=${type}]`)
        
        // evaluate and return the href values
        const foundFiles = await aElements.evaluateAll(links => {
            return links.map(link => {
                return link.href
            })
        }).catch(error => console.error({error}))


        
        if (foundFiles.length) {

            // add urls to array
            allFoundFiles.push(foundFiles)

        }
    }

    return allFoundFiles;
}

async function checkForAllWords(){
    let allFoundWords = [];

    for await (const word of words){
        const foundWords = await checkPageForText(word)

        if (foundWords.length) allFoundWords.push(foundWords)
        if (word === 'pric' && foundWords.length) bestGuesses.push(foundWords)
      
    }
    const flattened = allFoundWords.flat();

    // return a list of the unique links
    return [...new Set(flattened)]
}

async function checkUrl(url){

    try {


        // increment checked urls for this hospital by 1
        thisCheckedUrls += 1

        // make sure url is a string
        const string = typeof url === 'string' || url instanceof String

        if (string){
            // check if we've already looked at this url
            const alreadyChecked = allCheckedUrls.includes(url)

            // make sure it isn't a mailto url
            const mail = url.includes('mailto')

            // make sure it isn't going to a .gov site
            const cms = url.includes('.gov')

            // make sure it doesn't go off to paypal
            const paypal = url.includes('paypal')

            // make sure it isn't mychart login page
            const mychart = url.includes('mychart')

            // make sure it isn't a pdf
            const pdf = url.includes('.pdf')

            const goodToCheck = !alreadyChecked && !mail && !cms && !paypal && !mychart && !pdf

            // if it hasn't already been checked
            if (goodToCheck) {

                // add url to list of urls that have been checked
                allCheckedUrls.push(url)

                // if (url.includes('download')){
                //     // if the url triggered a download, don't click, skip it entirely
                //     return 'skipped'

                // } else {
                    // if the url doesn't appear to trigger a download, navigate to it
                    // go to page
                    await page.goto(url, {timeout: 7000, waitUntil: 'domcontentloaded'})

                    // checks page for word matches in a text or href
                    const foundWords = await checkForAllWords()
                        .catch(err => `Error finding words ${err}`)

                    // check page for files of the type we're looking for
                    const foundFiles = await checkForAllFiles()
                        .catch(err => `Error finding files ${err}`)

                    

                    if (foundWords.length && !foundFiles.length && !allFileUrls.length && thisCheckedUrls < MAX_TO_CHECK){
                        // if word match links were found but no files, run it again
                        for await (const foundWordUrl of foundWords){
                            if (foundWordUrl != url) await checkUrl(foundWordUrl);
                        }
                    }

                    else if (foundFiles.length){
                        const flatFileFindings = foundFiles.flat().flat();

                        const uniqueFindings = [...new Set(flatFileFindings)]

                        // if files were found, add them to our empty array
                        allFileUrls.push({foundAt: url, files: uniqueFindings})
                    }

                // }

            }
        }


        return 'success'
    }

    catch(error){
		console.error(`Error checking url: ${error}`)
		return `oops, ${url} failed`
	}
    
}

async function checkForDuplicates(a, b){
    a = Array.isArray(a) ? a : [];
    b = Array.isArray(b) ? b : [];
    return a.length === b.length && a.every(d => b.includes(d))
}

async function combineData(url){
    let fileUrls = allFileUrls.map(d => {
        return {
            originalUrl: url,
            foundAt: [d.foundAt],
            files: d.files
        }
    })[0]

    if (allFileUrls.length > 1) {
        const dupes = checkForDuplicates(allFileUrls[0].files, allFileUrls[1].files)

        // if the file links are duplicated, concatenate them
        if (dupes)  fileUrls = {originalUrl: url, foundAt: [allFileUrls[0].foundAt, allFileUrls[1].foundAt], files: allFileUrls[0].files} 
    }

    return fileUrls
    //data.push(fileUrls)

}

async function writeLocally(str, path){
    fs.writeFile(path, str, err => {
        if (err) {
            console.error(err)
            return
        }
    })
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


    
(async function findFiles(){ 
    console.time('finding hospitals')

    // download hospital urls from ddw
    //const hospitalURLs = await downloadHospitalUrls()

    //const hospitalURLs = ['https://www.medstarhealth.org/price-transparency-disclosures']

    // launch browser
    const browser = await chromium.launch({ headless: false, timeout: 2000, args:['--no-sandbox']});

    // launch browser context
    // const context = await browser.newContext();


    if (hospitalURLs){
        for  (const [index, url] of hospitalURLs.entries()){

            // launch a new page and save to global variable page
            page = await browser.newPage();
        
            // reset to blank
            allFileUrls = [];
            thisCheckedUrls = 0
            bestGuesses = [];
    
            // find if url is unique after redirect
            const unique = await checkDomain(url)
                .catch(err => `Something wrong with checking domain ${err}`)

    
            if (unique){
    
                const textFindings = await checkUrl(url)

                // after we're done checking the url, close the page
                await page.close()
    
    
                if (textFindings === 'success' && allFileUrls.length){
    
                    // combine information 
                    const fileUrls = await combineData(url)

                    // convert to string and save locally
                    const str = JSON.stringify(fileUrls)
                    console.log(fileUrls)
                    // foundLogger.write(str)
                    
                    // log out that something was found
                    console.log(`Found ${index}/${hospitalURLs.length - 1}`)
    
                } else if (textFindings === 'success' && !allFileUrls.length) {
                    // if the script has finished looking but found nothing
                    // add the url to our list of sites with missing information

                    // find unique URLs
                    const uniqueBest = [...new Set(bestGuesses.flat())]

                    const missingUrls = {originalUrl: url, bestGuesses: uniqueBest}

                    // convert to string and save locally
                    const str = JSON.stringify(missingUrls)
                    // missingLogger.write(str)
          
                    // log out that that url was missing files
                    console.log(`Missing ${index}/${hospitalURLs.length - 1}`)
                }
    
                // push updates to ddw every 50 urls checked in case something crashes
                if (index % BACKUP === 0 && index !== 0){
                    // await writeToDDW('data/links2.json', 'links2.json')
                    // await writeToDDW('data/missingLinks2.json', 'missingLinks2.json')

                    console.log('backed up data to ddw')
                }
    
                if (index === hospitalURLs.length - 1) {
                    //await context.close()
                    await browser.close()

                    // close writeable streams
                    // foundLogger.end()
                    // missingLogger.end()

                    // await writeToDDW('data/links2.json', 'links2.json')
                    // await writeToDDW('data/missingLinks2.json', 'missingLinks2.json')
                }
        
            }

        }
        console.log('for loop finished!')
        console.timeEnd('finding hospitals')
    }

})().catch(error => console.error(`Error going to site: ${error}`))