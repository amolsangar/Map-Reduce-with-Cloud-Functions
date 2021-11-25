const {Storage} = require('@google-cloud/storage');
const { default: axios } = require('axios');

exports.masterTrigger = (event, context) => {
    const gcsEvent = event;
    let name = gcsEvent.name;
    console.log(`Amol ${name}`);

    const projectID = process.env.projectID
    const region = process.env.region
    
    const storage = new Storage();
    async function listFiles() {
        // Lists files in the bucket
        const [files] = await storage.bucket('mr-results-bucket').getFiles();

        let files_list = []
        files.forEach(file => {
            files_list.push(file.name)            
        });
        return files_list
    }

    listFiles().then(async function(files_list) {
        console.log(files_list);
        if(!files_list)
            console.log("Empty file list")
        else if(files_list.includes("reducer1_input_update.json")) {
            console.log("start reducer for update")
            var requestArray = [
                {url: `https://${region}-${projectID}.cloudfunctions.net/red1?reducer_no=1&update=true`}
            ];

            // start reducer for update
            getAllUrls(requestArray)
        }
        else if(files_list.includes("mapper1_output.json") && files_list.includes("mapper2_output.json") && files_list.includes("mapper3_output.json")) {
            console.log("S_N_S")
            var requestArray = [
                {url: `https://${region}-${projectID}.cloudfunctions.net/s_n_s`}
            ];

            // start shuffleAndSort
            getAllUrls(requestArray)
        }
        else if(files_list.includes("reducer1_input.json") && files_list.includes("reducer2_input.json") && files_list.includes("reducer3_input.json")) {
            console.log("start reducer")
            var requestArray = [
                {url: `https://${region}-${projectID}.cloudfunctions.net/red1?reducer_no=1`},
                {url: `https://${region}-${projectID}.cloudfunctions.net/red1?reducer_no=2`},
                {url: `https://${region}-${projectID}.cloudfunctions.net/red1?reducer_no=3`}
            ];

            // start reducers parallely
            getAllUrls(requestArray)
        }
        else if(files_list.includes("reducer1_output_update.json")) {
            console.log("start result combiner")
            var requestArray = [
                {url: `https://${region}-${projectID}.cloudfunctions.net/reduceResultCombiner?update=true`}
            ];

            // start resultCombiner 
            getAllUrls(requestArray)
        }
        else if(files_list.includes("reducer1_output.json") && files_list.includes("reducer2_output.json") && files_list.includes("reducer3_output.json")) {
            console.log("start result combiner")
            var requestArray = [
                {url: `https://${region}-${projectID}.cloudfunctions.net/reduceResultCombiner`}
            ];

            // start resultCombiner 
            getAllUrls(requestArray)
        }
        else {
            console.log("Waiting for files!");
            return 'Operation complete'
        }
        
    })
    .catch(console.error);

    // FUNCTIONS
    async function getAllUrls(urls) {
        try {            
            urls.map(url => getAPI(url));
        } catch (error) {
            console.log("err",error)
            throw (error)
        }
    }

    const getAPI = (url) => {
        return new Promise((resolve, reject) => {
            return axios(url).then((response) => {
                resolve("Completed");  // return results
            }).catch((error) => {
                resolve(null);
            });
        });
    }
    
    async function getLock(fileName) {
        const storage = new Storage();
        const myBucket = storage.bucket('mr-io-bucket');
        const file = myBucket.file(fileName);
        await file.save()
        console.log("Lock Acquired");
        return "Lock Acquired"
    }
    
    async function isLock(fileName) {
        const storage = new Storage();
        let file = await storage.bucket("mr-io-bucket").file(fileName);
        ifExist =  file.exists();
        return ifExist
    }
    
    async function releaseLock(fileName) {
        const storage = new Storage();
        await storage.bucket('mr-io-bucket').file(fileName).delete();
        console.log("Lock Released");
        return "Lock Released"
    }

};