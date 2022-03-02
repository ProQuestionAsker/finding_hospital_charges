const { chromium } = require('playwright');
const fs = require('fs');
const needle = require('needle')
require('dotenv').config()


let page;

const words = ['pric', 'insurance', 'cms', 'estimat', 'charg', 'pay']
const fileTypes = ['xls', 'csv', 'json', 'ashx', 'txt', 'zip']

let allFileUrls = [];
let allCheckedUrls = [];
let data = [];
let missingData = [];

// list of test hospitalURLs
const hospitalURLs = ['http://www.nationaljewish.org/','http://www.nationaljewish.org/', 'https://www.nyp.org/morganstanley', 'https://www.hopkinsmedicine.org/', 'https://www.providence.org/', 'http://www.christushealth.org', 'http://oregon.providence.org/location-directory/p/providence-st-vincent-medical-center/', 
'https://www.mayoclinic.org/', 'http://www.partners.org/', 'http://www.massgeneral.org/international', 'http://www.unitypoint.org/', 'https://www.nyp.org/morganstanley']


async function getDomain(url){
    const match = url.match(`^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)`)
    return domain = match[0]
}

async function checkDomain(url){

    // navigate to page
    await page.goto(url, {waitUntil: 'domcontentloaded'})

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
    }
    const flattened = allFoundWords.flat();

    // return a list of the unique links
    return [...new Set(flattened)]
}

async function checkUrl(url){

    try {

        // check if we've already looked at this url
        const alreadyChecked = allCheckedUrls.includes(url)

        // make sure it isn't a mailto url
        const mail = url.includes('mailto')

        // if it hasn't already been checked
        if (!alreadyChecked && !mail) {

            // add url to list of urls that have been checked
            allCheckedUrls.push(url)

            if (url.includes('download')){
                // if the url triggered a download, add that download to allFiles and don't go to page
                const [download] = await Promise.all([
                    page.waitForEvent('download'),
                    page.locator(`a[href="${url}"]`).click()
                ])
                download.delete()
                const downloadUrl = download.url()
                allFileUrls.push({foundAt: url, files: [downloadUrl]})

            } else {
                // if the url doesn't appear to trigger a download, navigate to it
                // go to page
                await page.goto(url, {waitUntil: 'domcontentloaded'})

                // checks page for word matches in a text or href
                const foundWords = await checkForAllWords();

                // check page for files of the type we're looking for
                const foundFiles = await checkForAllFiles();

                if (foundWords.length && !foundFiles.length && !allFileUrls.length){
                    // if word match links were found but no files, run it again
                    for await (const foundWordUrl of foundWords){
                        if (foundWordUrl != url) await checkUrl(foundWordUrl);
                    }
                }

                else if (foundFiles.length){
                    const flatFileFindings = foundFiles.flat().flat();

                    const uniqueFindings = [...new Set(flatFileFindings)]

                    // if files were found, add them to our empty array
                    allFileUrls.push({foundAt: url, files: flatFileFindings})
                }

            }

        }

        return 'success'
    }

    catch(error){
		console.error(`Error making checking url: ${error}`)
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

    data.push(fileUrls)

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
    const agentid = 'amberthomas'
    const datasetid = 'location-of-price-transparency-data'

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

async function writeData(str, filename, path){

    await writeLocally(str, path)
    await writeToDDW(path, filename)

}



    
(async function findFiles(){

    // launch browser
    const browser = await chromium.launch({ headless: false, timeout: 20000, args:['--no-sandbox']});

    // launch browser context
    const context = await browser.newContext();

    // launch a new page and save to global variable page
    page = await context.newPage();

    for await (const [index, url] of hospitalURLs.entries()){
        
        // reset to blank
        allFileUrls = [];

        // find if url is unique after redirect
        const unique = await checkDomain(url)

        if (unique){

            const textFindings = await checkUrl(url)


            if (textFindings === 'success' && allFileUrls.length){

                await combineData(url)
                console.log(`Found ${index}/${hospitalURLs.length - 1}`)

            } else if (textFindings === 'success' && !allFileUrls.length) {
                // if the script has finished looking but found nothing
                // add the url to our list of sites with missing information
                missingData.push({originalUrl: url})
                console.log(`Missing ${index}/${hospitalURLs.length - 1}`)
            }

            if (index === hospitalURLs.length - 1) {
                await context.close()
                await browser.close()
                const allStr = JSON.stringify(data)
                await writeData(allStr, 'links.json', 'data/links.json');

                const missingStr = JSON.stringify(missingData)
                await writeData(missingStr, 'missingLinks.json', 'data/missingLinks.json')
    
            }
    
        }



        // TODO
        // export to data.world dataset

    }
    console.log('for loop finished!')
  

})().catch(error => console.error(`Error going to site: ${error}`))