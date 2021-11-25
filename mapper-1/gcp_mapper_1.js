// Imports the Google Cloud client library
const {Storage} = require('@google-cloud/storage');

exports.mapper = (req, res) => {
    if(!req.query.start || !req.query.end || !req.query.mapper_no) {
        let message = "Please provide start & end file no's and mapper number"
        res.status(200).send(message);
    }

    let update = false
    if(req.query.update) {
        if(req.query.update == "true")
            update = true
    }

    let start = parseInt(req.query.start)
    let end = parseInt(req.query.end)

    let mapper_no = parseInt(req.query.mapper_no)

    let doc_names = []
    for(let i=start; i<end; i++) {
        let doc = i + ".txt"
        doc_names.push(doc)
    }

    const storage = new Storage();

    async function listFiles() {
        // Lists files in the bucket
        const [files] = await storage.bucket('mr-io-bucket').getFiles();

        let all_files_list = []
        files.forEach(file => {
            all_files_list.push(file.name);
        });

        return all_files_list
    }

    listFiles().then(function(all_files){
        doc_names = doc_names.filter(d => all_files.includes(d))
        console.log(doc_names);

        const myBucket = storage.bucket('mr-io-bucket');
        const readFromFile = async remoteFilePath => {
                return new Promise((resolve, reject) => {
                let buf = ''
                myBucket.file(remoteFilePath)
                .createReadStream()
                .on('data', d => (buf += d))
                .on('end', () => resolve(buf))
                .on('error', e => reject(e))
            })
        }

        var promises = doc_names.map(function(_path) {
            return readFromFile(_path);
        })

        let map_result = {}

        Promise.all(promises).then(function(results){
            for(let i=0;i<results.length;i++) {
                let docs = results[i]

                let separators = [' ', '\\\+', '-', '\\\(', '\\\)', '\\*', '/', ':', '\\\?', '\\r'];
                let words = docs.split(new RegExp(separators.join('|'), 'g'))

                let stopwords = ["","a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any","are","aren't","as","at","be","because","been","before","being","below","between","both","but","by","can't","cannot","could","couldn't","did","didn't","do","does","doesn't","doing","don't","down","during","each","few","for","from","further","had","hadn't","has","hasn't","have","haven't","having","he","he'd","he'll","he's","her","here","here's","hers","herself","him","himself","his","how","how's","i","i'd","i'll","i'm","i've","if","in","into","is","isn't","it","it's","its","itself","let's","me","more","most","mustn't","my","myself","no","nor","not","of","off","on","once","only","or","other","ought","our","ours","ourselves","out","over","own","same","shan't","she","she'd","she'll","she's","should","shouldn't","so","some","such","than","that","that's","the","their","theirs","them","themselves","then","there","there's","these","they","they'd","they'll","they're","they've","this","those","through","to","too","under","until","up","very","was","wasn't","we","we'd","we'll","we're","we've","were","weren't","what","what's","when","when's","where","where's","which","while","who","who's","whom","why","why's","with","won't","would","wouldn't","you","you'd","you'll","you're","you've","your","yours","yourself","yourselves"];

                let result = []
                for(let i=0;i<words.length;i++) {
                    let word = words[i].trim()
                    word = word.replace(/[\W_]/g, "");    // replace special chars
                    word = word.toLowerCase()
                    if(!stopwords.includes(word)) {
                        result.push(word)
                    }
                }

                result.map((x) => {
                    try {
                        if(map_result[x]) {
                            let flag = false

                            for(let item=0;item<map_result[x].length;item++) {
                                if(map_result[x][item]["doc_id"] == doc_names[i]) {
                                    map_result[x][item]["count"] += 1
                                    flag = true
                                }
                            }
                            if(!flag)
                                map_result[x].push({ "doc_id":doc_names[i], "count":1 })          

                        }
                        else
                            map_result[x] = [{ "doc_id":doc_names[i], "count":1 }]
                    }
                    catch(err) {
                        console.log(err);
                    }
                    
                })

            }

            console.log(JSON.stringify(map_result).slice(0,100));

            const myBucket2 = storage.bucket('mr-results-bucket');
            let filename
            if(update) {
                filename = `reducer${mapper_no}_input_update.json`
            }
            else {
                filename = `mapper${mapper_no}_output.json`
            }
            const file = myBucket2.file(filename);
            file.save(JSON.stringify(map_result)).then(function() {
                console.log("File Saved to Bucket");
                res.status(200).send("Operation completed");
            });

        });
    }).catch(console.error);

}