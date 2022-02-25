const { strict } = require('once');
const { chromium } = require('playwright');

// process.env.DEBUG='pw:api'

const words = ['pric', 'bill', 'insurance', 'cms']

async function checkAllMatches(page, found, word){
    let allUrls = [];

    for (const url of found){
        const fileUrls = await checkPageForFiles(page, url)


        if (fileUrls.length){
            allUrls = {pageFound: url, files: fileUrls, word}
        }
        
    }


    return allUrls
}

async function checkAllText(page, url){
    let allUrls = []
    // navigate to page
    await page.goto(url, {waitUntil: 'domcontentloaded'})

    for (const [index, word] of words.entries()){
        const found = await checkPageForText(page, word)

        // if found, move on
        if (found.length) {

            const urls = await checkAllMatches(page, found, word)

            if (urls.length != 0) allUrls.push(urls)
            
        }
    }
    return allUrls
}

async function checkPageForText(page, text){


    // find a elements with specified text string
    const elements = await page.locator('a', {hasText: text})

    // collect URLs for all of those links
    const linkUrls = await elements.evaluateAll(links => {
        return links.map(link => {
            return link.href
        })
    })

    // return unique URLs with a text match for "text" string
    return [...new Set(linkUrls)]
}

async function checkPageForFiles(page, url){
    // define acceptable file types
    const fileTypes = ['xls', 'csv', 'json', 'ashx', 'txt']

    // define empty array for final URLs
    const fileUrls = []

    // go to page
    await page.goto(url, {waitUntil: 'domcontentloaded'})


    for (type of fileTypes){

        // find all link elements with file type
        const aElements = page.locator(`a[href*=${type}]`)
        
        // evaluate and return the href values
        const allUrls = await aElements.evaluateAll(links => {
            return links.map(link => {
                return link.href
            })
        }).catch(error => console.error({error}))


        
        if (allUrls.length) {

            // //const el = await page.locator("h3:above(a)", 20).allInnerTexts()//.getAttribute('text')
            // const el = await page.locator(`h3:near(a[href*=${type}])`).allInnerTexts()//.getAttribute('text')

            // add urls to array
            fileUrls.push(allUrls)

        }

    }

    
    // return flattened array of URLs
    return fileUrls.flat()

}



(async function findFiles(url){
    // list of test hospitalURLs
    const hospitalURLs = ['https://www.mayoclinic.org/', 'https://www.swedish.org/']

    // launch browser
    const browser = await chromium.launch({ headless: false, timeout: 20000, args:['--no-sandbox']});

    const context = await browser.newContext();
    const page = await context.newPage();

    for (const [index, url] of hospitalURLs.entries()){
        // First check the homepage for anything that starts with "Pric"
        // This will find any links that have "Pricing" or "Price" in the text
        const textFindings = await checkAllText(page, url)
            
        //const filtered = textFindings.filter(d => d.files.length)
        console.log(textFindings)

    }
  

})().catch(error => console.error(`Error going to site: ${error}`))


    
