This file contains several scripts which are all used for the purposes of locating and consolidating pricing information from hospitals around the US.

# index.js
## Running the script
This script can be run using `npm run start`

## What it does
This script runs in several steps:
1. It accesses the results of a query run on data.world. It expects that the query will return a single column called "searchUrl" and within that column is a single URL per row. The query results are downloaded and stored in local memory.
2. Using Microsoft Playwright, it then opens a chromium browser window, navigates to the first URL in the list, searches the contents for `a` links that contain either certain strings (e.g., `pric`, `bill`, `cms` etc.) in the displayed text or the href value, or contain particular file extensions (e.g., `xls`, `csv`, `json` etc.) The strings can be updated by changing  `words` in `index.js` and the file extensions can be changed by updating `fileTypes` in `index.js`
3. When links are found, the browser navigates to each of the links, once again looking for `a` links that contain certain strings or file extensions. When files are found, the search ends, and a new page is opened and navigates to the next hospital URL on the list.
**Note** To keep this from running endlessly all over the internet, it will force stop searching URLs after it has searched a specific number for a given hospital. Change this number by updating `MAX_TO_CHECK` in `index.js`
4. When links have been found, the URL for each link, the URL that the links were found on, and the original URL used to find the hospital are formatted as a JSON object, and written to a local file (`links.json`) using a `writeStream`. Similarly, if links haven't been found after the `MAX_TO_CHECK` number of URLs has been searched, the original URL and a "best guess" of where the files may be are written to a local file (`missingLinks.json`) using a `writeStream`.
5. After a certain number of hospitals have been checked, the files are automatically added to a [data.world dataset](https://data.world/ushealthcarepricing/location-of-standard-charge-files). To change how often this happens, update the `BACKUP` variable in `index.js`.

## What you need
This script expects that you have data.world API credentials saved in a `.env` file at the base of your project directory. You'll find more information about data.world API credentials [here](https://docs.data.world/en/64499-65048-10--Finding-your-API-tokens-for-data-world.html). You'll also need write permissions for the [ushealthcarepricing organization](https://data.world/ushealthcarepricing) on data.world.

# clean.js
## Running the script
This script can be run using `npm run clean`

## What it does
This script parses the data found by running `index.js`, and cleans it by removing:
* any files that include the substring "captcha"
* any files that didn't have a full file extension of `.csv`, `.json`, `.xls` etc.
* any duplicate file urls
* any hospitals that have no files found

After the data has been cleaned, the file is uploaded as `links.json` to a [data.world dataset](https://data.world/ushealthcarepricing/location-of-standard-charge-files), **replacing** the `links.json` file that had been in its place.

## What you need
This script expects that you have data.world API credentials saved in a `.env` file at the base of your project directory. You'll find more information about data.world API credentials [here](https://docs.data.world/en/64499-65048-10--Finding-your-API-tokens-for-data-world.html). You'll also need write permissions for the [ushealthcarepricing organization](https://data.world/ushealthcarepricing) on data.world.

# uploadToDdw.js
## Running the script
This script can be run using `npm run upload`

## What it does
This script parses the results of `index.js` and `clean.js` and creates a new dataset for each hospital or hospital network and automatically imports all found data files. Ultimately, it:
1. Uses the data.world API to import the [results of a query](https://data.world/ushealthcarepricing/preparing-for-dataset-upload/workspace/query?queryid=185fb2f9-fdea-487c-ba32-2afc2459783b), which was used to join the results of `clean.js` with additional data about each hospital to include the hospital or network's name alongside the URL information found.
2. For each hospital in the imported list, the script parses the JSON content, includes additional information alongside the file URL to match the requirements for the [Create a dataset](https://apidocs.data.world/docs/dwapi-spec-stoplight/b3A6MjI4NDAxNTk-create-a-dataset) API endpoint. Similarly, the information about each hospital is used to construct the title, description, summary and other necessary metadata used in the creation of each dataset.
3. Then, a new dataset is created on data.world and the found data file URLs are used to automatically import the data
4. Any files that failed to import properly are saved in a local file (`failedToUpload.json`)

## What you need
This script expects that you have data.world API credentials saved in a `.env` file at the base of your project directory. You'll find more information about data.world API credentials [here](https://docs.data.world/en/64499-65048-10--Finding-your-API-tokens-for-data-world.html). You'll also need write permissions for the [ushealthcarepricing organization](https://data.world/ushealthcarepricing) on data.world.
