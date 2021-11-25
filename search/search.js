// Imports the Google Cloud client library
const {Storage} = require('@google-cloud/storage');
const axios = require('axios');

exports.search = (req, res) => {
    res.set('Access-Control-Allow-Origin', "*")
    res.set('Access-Control-Allow-Methods', 'GET, POST');

    if (req.method === "OPTIONS") {
        // stop preflight requests here
        res.status(204).send('');
        return;
    }
    
    if(!req.query.q) {
        let message = "Please provide search string"
        res.status(200).send(message);
        return
    }

    let input_file = ['final_output.json']

   // Creates a client
    const storage = new Storage();

    const myBucket = storage.bucket('mr-results-bucket');

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
    
    var promises = input_file.map(function(_path) {
        return readFromFile(_path);
    })
    
    // let search_sentence = "Treasure Island"
    let search_sentence = req.query.q;

    let result = {}

    Promise.all(promises).then(function(results){
        let search_doc = JSON.parse(results)

        let separators = [' ', '\\\+', '-', '\\\(', '\\\)', '\\*', '/', ':', '\\\?', '\\r'];
        let words = search_sentence.split(new RegExp(separators.join('|'), 'g'))

        let stopwords = ["","a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any","are","aren't","as","at","be","because","been","before","being","below","between","both","but","by","can't","cannot","could","couldn't","did","didn't","do","does","doesn't","doing","don't","down","during","each","few","for","from","further","had","hadn't","has","hasn't","have","haven't","having","he","he'd","he'll","he's","her","here","here's","hers","herself","him","himself","his","how","how's","i","i'd","i'll","i'm","i've","if","in","into","is","isn't","it","it's","its","itself","let's","me","more","most","mustn't","my","myself","no","nor","not","of","off","on","once","only","or","other","ought","our","ours","ourselves","out","over","own","same","shan't","she","she'd","she'll","she's","should","shouldn't","so","some","such","than","that","that's","the","their","theirs","them","themselves","then","there","there's","these","they","they'd","they'll","they're","they've","this","those","through","to","too","under","until","up","very","was","wasn't","we","we'd","we'll","we're","we've","were","weren't","what","what's","when","when's","where","where's","which","while","who","who's","whom","why","why's","with","won't","would","wouldn't","you","you'd","you'll","you're","you've","your","yours","yourself","yourselves"];

        let word_to_search = []
        for(let i=0;i<words.length;i++) {
            let word = words[i].trim()
            word = word.replace(/[\W_]/g, "");    // replace special chars
            word = word.toLowerCase()
            if(!stopwords.includes(word)) {
                word_to_search.push(word)
            }
        }

        word_to_search.map(w => {
            let doc_id_arr = search_doc[w]

            let document_name = ""
            doc_id_arr.map(doc_obj => {
                if(result[doc_obj["doc_id"]]) {
                    result[doc_obj["doc_id"]] += doc_obj["count"]
                }
                else {
                    result[doc_obj["doc_id"]] = doc_obj["count"]
                }
                document_name += "\n" + doc_obj["doc_id"]
                
            })
            
            // console.log(document_name);
            // console.log(result);
        })
        
        // https://stackoverflow.com/questions/1069666/sorting-object-property-by-values
        const desc_sorted_result = Object.fromEntries(
            Object.entries(result).sort(([,a],[,b]) => b-a)
        );

        // console.log(desc_sorted_result);

        const myBucket2 = storage.bucket('mr-io-bucket');

        let jsonResult = {}
        const readFileBucket2 = async remoteFilePath => {
            return new Promise((resolve, reject) => {
                let buf = ''
                myBucket2.file(remoteFilePath)
                .createReadStream()
                .on('data', d => (buf += d))
                .on('end', () => resolve(buf))
                .on('error', e => reject(e))
            })
        }
        
        let input2 = ['mr-file-mappings.txt']
        var promises2 = input2.map(function(_path) {
            return readFileBucket2(_path);
        })
        Promise.all(promises2).then(function(data){

            let fileMapping = JSON.parse(data)
            for(key in desc_sorted_result) {
                jsonResult[key] = fileMapping[key]
            }
            // console.log(jsonResult);
            res.status(200).send(jsonResult);
        });

    })

}