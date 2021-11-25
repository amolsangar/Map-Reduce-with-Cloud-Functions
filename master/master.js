const { default: axios } = require('axios');

exports.startMapReduce = (req, res) => {
  if(!req.query.start || !req.query.end) {
    let message = "Please provide start and end file range"
    res.status(200).send(message);
  }

  const projectID = process.env.projectID
  const region = process.env.region

  let start = parseInt(req.query.start)
  let end = parseInt(req.query.end)

  let size = end - start
  let bucket_size = parseInt(size / 3)

  let s1 = start
  let e1 = start + bucket_size

  let s2 = start + bucket_size
  let e2 = start + (bucket_size * 2)

  let s3 = start + (bucket_size * 2)
  let e3 = end

  var requestArray = [
    {url: `https://${region}-${projectID}.cloudfunctions.net/map1?start=${s1}&end=${e1}&mapper_no=1`},
    {url: `https://${region}-${projectID}.cloudfunctions.net/map1?start=${s2}&end=${e2}&mapper_no=2`},
    {url: `https://${region}-${projectID}.cloudfunctions.net/map1?start=${s3}&end=${e3}&mapper_no=3`}
  ];

  async function getAllUrls(urls) {
    try {
      urls.map(url => getAPI(url));
    } catch (error) {
      console.log(error)
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

  // start mappers parallely
  getAllUrls(requestArray)

  res.status(200).send("Operation complete");
}