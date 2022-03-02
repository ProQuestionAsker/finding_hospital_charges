const { chromium } = require('playwright');
const fs = require('fs');


let page;

const words = ['pric', 'insurance', 'cms', 'estimat', 'charg']
const fileTypes = ['xls', 'csv', 'json', 'ashx', 'txt']

let allFileUrls = [];
let allCheckedUrls = [];
let data = [];

// list of test hospitalURLs
const hospitalURLs = [ 'https://www.providence.org/', 'http://www.christushealth.org', 'http://oregon.providence.org/location-directory/p/providence-st-vincent-medical-center/', 
'https://www.mayoclinic.org/']


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
    let fileUrls = allFileUrls.map(d => {
        return {
            ...d,
            originalUrl: url
        }
    })

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

async function searchPage(){
    // type price transparency into search bar
    await page.fill('input:has-text(`Search`)', 'price transparency')
    await page.press('input:has-text(`Search`)', 'Enter')

    // checks page for word matches in a text or href
    const foundWords = await checkForAllWords();

    for (const url of foundWords){
        await checkUrl(url)
    }


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

        if (unique){

            const textFindings = await checkUrl(url)

            if (textFindings === 'success' && !allFileUrls.length){
                // last ditch effort if no files have been found so far; 
                // find a search bar of some kind, type in "price transparency, enter, and run the process again on the results"
                const searchFindings = await searchPage()
            }

            // if (textFindings === 'success' && allFileUrls.length){

            //     await combineData(url)

            // } else {
            //     // last ditch effort, find a search bar of some kind, type in "price transparency, enter, and run the process again on the results"
            // }

            // if (index === hospitalURLs.length - 1) {
            //     console.log('last one!')
            //     await context.close()
            //     await browser.close()
            //     const allStr = JSON.stringify(data)
            //     await writeData(allStr);
    
            // }
    

        }


            


        // TODO
        // export to data.world dataset

    }
    console.log('for loop finished!')
    console.log(data)
  

})().catch(error => console.error(`Error going to site: ${error}`))