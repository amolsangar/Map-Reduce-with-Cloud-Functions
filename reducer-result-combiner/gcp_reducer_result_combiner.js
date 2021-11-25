// Imports the Google Cloud client library
const {Storage} = require('@google-cloud/storage');

exports.combineResult = (req, res) => {
    let update = false
    if(req.query.update) {
        if(req.query.update == "true")
            update = true
    }

    let input_file
    if(update) {
        input_file = ['final_output.json','reducer1_output_update.json']
    }
    else {
        input_file = ['reducer1_output.json','reducer2_output.json','reducer3_output.json']
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

    let final_output = {}

    Promise.all(promises).then(function(results){
        if(update) {
            final_output = JSON.parse(results[0])       // Final Output JSON
            for(let i=1;i<results.length;i++) {
                var reduce_input = JSON.parse(results[i])
                reduce_input = [reduce_input]

                reduce_input.map(doc => {
                    
                    let keys = Object.keys(doc)
                    keys.map(k => {
                        if(k != "word") {
                            if(final_output[k]) {
                                // console.log(final_output[k]);
                                for(let item=0; item<doc[k].length; item++) {
                                    final_output[k].push(doc[k][item])
                                }
                            }
                            else
                                final_output[k] = doc[k]
                        }
                    })
                })
            }
            
            // DELETE INPUT FILES
            let del_file = []
            del_file.push(input_file[1])
            del_file.forEach(async file => {
                await storage.bucket('mr-results-bucket').file(file).delete();
            });
        }
        else {
            for(let i=0;i<results.length;i++) {
                let result = JSON.parse(results[i])
    
                let keys = Object.keys(result)
    
                keys.map(k => {
                    final_output[k] = result[k]
                })
            }

            // DELETE INPUT FILES
            input_file.forEach(async file => {
                await storage.bucket('mr-results-bucket').file(file).delete();
            });
        }

        const myBucket2 = storage.bucket('mr-results-bucket');
        const file = myBucket2.file(`final_output.json`);
        file.save(JSON.stringify(final_output)).then(function() {
            console.log("File Saved to Bucket");
            res.status(200).send("Operation completed");
        });
    });

}