const { chromium } = require('playwright');
const ddw = require('data-world-api');
const fs = require('fs');


let page;

const words = ['pric', 'insurance', 'cms', 'estimat', 'charg']
const fileTypes = ['xls', 'csv', 'json', 'ashx', 'txt']

let allFileUrls = [];
let allCheckedUrls = [];
let data = [];

// list of test hospitalURLs
const hospitalURLs = [ 'http://www.christushealth.org', 'https://www.providence.org/','http://oregon.providence.org/location-directory/p/providence-st-vincent-medical-center/', 
'https://www.mayoclinic.org/']

// steps:
// 1. check for text or href matches of the words
// 2. if they're found, navigate to each page in turn
// 3. inside each page, check for files.
// 3a. if there are files inside, log that info
// 3b. if there aren't files inside, start at step 1 again

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

    // // if it's already in the list and it isn't the parent itself, return null
    // if (alreadyInList && !urlIsDomain) return null;

    // // otherwise, look for matching text on the page
    // else {

    //     for (const [index, word] of words.entries()){
    //         allUrls = await checkForTextandFiles(word).catch(error => console.error(`Error at checkForTextandFiles: ${error}`))
    //     }
    //     return allUrls
    // }

}
async function checkPageForText(text){

    // find a elements with specified text string in displayed text or url
    const elements = await page.locator(`a:has-text('${text}')`, `a[href*=${text}]`)

    // collect URLs for all of those links
    const linkUrls = await elements.evaluateAll(links => {
        return links.map(link => {
            return link.href
        })
    })

    // return unique URLs with a text match for "text" string
    return [...new Set(linkUrls)]
}


async function checkForAllFiles(){
    let allFoundFiles = [];

    for (type of fileTypes) {
        // find all link elements with file type
        const aElements = page.locator(`a[href*=${type}]`)
        
        // evaluate and return the href values
        const foundFiles = await aElements.evaluateAll(links => {
            return links.map(link => {
                return link.href
            })
        }).catch(error => console.error({error}))


        
        if (foundFiles.length) {

            // //const el = await page.locator("h3:above(a)", 20).allInnerTexts()//.getAttribute('text')
            // const el = await page.locator(`h3:near(a[href*=${type}])`).allInnerTexts()//.getAttribute('text')

            // add urls to array
            allFoundFiles.push(foundFiles)

        }
    }

    return allFoundFiles;
}

async function checkForAllWords(){
    let allFoundWords = [];

    for (const word of words){
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

        // if it hasn't already been checked
        if (alreadyChecked === false) {

            // add url to list of urls that have been checked
            allCheckedUrls.push(url)

            // go to page
            await page.goto(url, {waitUntil: 'domcontentloaded'})

            // checks page for word matches in a text or href
            const foundWords = await checkForAllWords();

            // check page for files of the type we're looking for
            const foundFiles = await checkForAllFiles();

            //console.log({url, foundWords, foundFiles})

            if (foundWords.length && !foundFiles.length && !allFileUrls.length){
                // if word match links were found but no files, run it again
                for (const foundWordUrl of foundWords){
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
    let fileUrls = {originalUrl: url, foundAt: [allFileUrls[0].foundAt], files: allFileUrls[0].files}

    if (allFileUrls.length > 1) {
        const dupes = checkForDuplicates(allFileUrls[0].files, allFileUrls[1].files)

        // if the file links are duplicated, concatenate them
        if (dupes)  fileUrls = {originalUrl: url, foundAt: [allFileUrls[0].foundAt, allFileUrls[1].foundAt], files: allFileUrls[0].files} 
    }

    data.push(fileUrls)

}

async function writeData(str){
    fs.writeFile('data/links.json', str, err => {
        if (err) {
            console.error(err)
            return
        }
    })
}







    
(async function findFiles(){

    // launch browser
    const browser = await chromium.launch({ headless: false, timeout: 20000, args:['--no-sandbox']});

    // launch browser context
    const context = await browser.newContext();

    // launch a new page and save to global variable page
    page = await context.newPage();

    for (const [index, url] of hospitalURLs.entries()){
        
        // reset to blank
        allFileUrls = [];

        // find if url is unique after redirect
        const unique = await checkDomain(url)
        console.log({unique, url})

        if (unique){

            const textFindings = await checkUrl(url)
 
            console.log(allFileUrls, index, hospitalURLs.length)

            if (textFindings === 'success' && allFileUrls.length){
                await combineData(url)
            }

            if (index === hospitalURLs.length - 1) {
                console.log('last one!')
                await context.close()
                await browser.close()
                const allStr = JSON.stringify(data)
                await writeData(allStr);
    
            }
    

        }


            


        // TODO
        // export to data.world dataset

    }
    console.log('for loop finished!')
    console.log(data)
  

})().catch(error => console.error(`Error going to site: ${error}`))