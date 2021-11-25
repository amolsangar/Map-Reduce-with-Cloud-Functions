// Imports the Google Cloud client library
const {Storage} = require('@google-cloud/storage');

exports.shuffleAndSort = (req, res) => {
    let input_file = ['mapper1_output.json','mapper2_output.json','mapper3_output.json']

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
    
    let shuffe1 = []
    let shuffe2 = []
    let shuffe3 = []

    Promise.all(promises).then(function(results){
        for(let i=0;i<results.length;i++) {
            let input = JSON.parse(results[i])
    
            for(let j=0,k=1; j<27; j=j+9,k++) {
    
                let start = j
                let end
                if(j==18) {
                    end = 36
                }
                else {
                    end = j+9
                }
    
                var characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
                var startWithArray = []
                for (let index = start; index < end; index++ ) {
                    startWithArray.push(characters.charAt(index))
                }
    
                const filteredKeys = Object.keys(input).filter(k => startWithArray.some(char => k.startsWith(char)));
    
                filteredKeys.map(fk => {
                    switch(k) {
                        case 1: shuffe1.push({
                            "word": fk,
                            [fk]: input[fk]
                        })
                            break;
                        case 2: shuffe2.push({
                            "word": fk,
                            [fk]: input[fk]
                        })
                            break;
                        case 3: shuffe3.push({
                            "word": fk,
                            [fk]: input[fk]
                        })
                            break;
                        default: 
                    }
                })
            }        
        }

        const storage2 = new Storage();
    
        // DELETE INPUT FILES
        input_file.forEach(async file => {
            await storage.bucket('mr-results-bucket').file(file).delete();
        });
    
        for( let k=1; k<4;k++) {
            let file = []
            switch(k) {
                case 1: file = shuffe1
                    break;
                case 2: file = shuffe2
                    break;
                case 3: file = shuffe3
                    break;
                default: 
            }
    
            const ordered = file.sort((a, b) => (a.word > b.word) ? 1 : -1)

            const myBucket2 = storage2.bucket('mr-results-bucket');
            const writeFile = myBucket2.file(`reducer${k}_input.json`);
            writeFile.save(JSON.stringify(ordered)).then(function() {
                console.log("File Saved to Bucket");
            });
        }
        
    });

}