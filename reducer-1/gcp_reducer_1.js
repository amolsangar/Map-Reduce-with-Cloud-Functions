// Imports the Google Cloud client library
const {Storage} = require('@google-cloud/storage');

exports.reducer = (req, res) => {
    if(!req.query.reducer_no) {
        let message = "Please provide reducer number"
        res.status(200).send(message);
    }

    let update = false
    if(req.query.update) {
        if(req.query.update == "true")
            update = true
    }

    let reducer_no = parseInt(req.query.reducer_no)

    let input_file = []
    if(update) {
        let txt = `reducer${reducer_no}_input_update.json`
        input_file.push(txt)
    }
    else {
        let txt = `reducer${reducer_no}_input.json`
        input_file.push(txt)
    }

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

    Promise.all(promises).then(function(results){
        for(let i=0;i<results.length;i++) {
            let reduce_result = {}
    
            var reduce_input = JSON.parse(results[i])
            if(update)
                reduce_input = [reduce_input]       // mapper1 returns an object
    
            reduce_input.map(doc => {
                
                let keys = Object.keys(doc)
                keys.map(k => {
                    if(k != "word") {
                        if(reduce_result[k]) {
            
                            for(let item=0; item<doc[k].length; item++) {
                                reduce_result[k].push(doc[k][item])
                            }
                        }
                        else
                            reduce_result[k] = doc[k]
                    }
                })
            })

            // DELETE INPUT FILE
            input_file.forEach(async file => {
                await storage.bucket('mr-results-bucket').file(file).delete();
            });

            const myBucket2 = storage.bucket('mr-results-bucket');
            let filename
            if(update) {
                filename = `reducer${reducer_no}_output_update.json`
            }
            else {
                filename = `reducer${reducer_no}_output.json`
            }
            const file = myBucket2.file(filename);
            file.save(JSON.stringify(reduce_result)).then(function() {
                console.log("File Saved to Bucket");
                res.status(200).send("Operation completed");
            });
        }
    });

}