from google.cloud import storage
from bs4 import BeautifulSoup
import io
import requests
import json

# https://us-central1-fa21-engr-e516-asangar.cloudfunctions.net/test2?bucket_name=mr-io-bucket&start=10&end=13

def download_project_gutenberg(request):
    """Responds to any HTTP request.
    Args:
        request (flask.Request): HTTP request object.
    Returns:
        The response text or any set of values that can be turned into a
        Response object using
        `make_response <http://flask.pocoo.org/docs/1.0/api/#flask.Flask.make_response>`.
    """
    request_json = request.get_json()
    if request.args and 'bucket_name' in request.args and 'start' in request.args and 'end' in request.args:
        bucket_name = request.args.get('bucket_name')
        start = int(request.args.get('start'))
        end = int(request.args.get('end'))

        storage_client = storage.Client()
        bucket = storage_client.get_bucket(bucket_name)

        dictMapping = {}

        for no in range(start,end):
            extensions = ('.txt', '-0.txt','-8.txt')
            for extension in extensions:
                download_uri = f"https://www.gutenberg.org/files/{no}/{str(no)+extension}"
                response = requests.head(download_uri)
                if response.ok:
                    response = requests.get(download_uri)
                    text = response.text
                    text.strip()
                    if(len(text) == 0):
                        continue
        
                    # Create a new blob and upload the file's content.
                    my_file = bucket.blob(f'{no}.txt')

                    # create in memory file
                    output = io.StringIO(text)

                    # upload from string
                    my_file.upload_from_string(output.read(), content_type="text/plain; charset=utf-8")

                    output.close()

                    # list created files
                    # blobs = storage_client.list_blobs(bucket)
                    # for blob in blobs:
                    #     print(blob.name)

                    # Make the blob publicly viewable.
                    # my_file.make_public()

            # To find Title
            extensions = ['.htm']
            for extension in extensions:
                download_uri = f"https://www.gutenberg.org/files/{no}/{str(no)}-h/{str(no)}-h{extension}"
                response = requests.head(download_uri)
                title = no
                if response.ok:
                    response = requests.get(download_uri)
                    text = response.text
                    text.strip()
                    if(len(text) == 0):
                        title = no
                        continue
                    
                    bs = BeautifulSoup(text, "html.parser")
                    titles = bs.find_all(["title"])
                    title = str(titles).replace("[<title>","")
                    title = title.replace("</title>]","")
                    title = title.strip()
                
                if(title == no):
                    link = f'https://gutenberg.org/files/{no}/'
                else:
                    link = download_uri
                
                dictMapping[str(no)+'.txt'] = [{
                    "title": title,
                    "link": link
                }]
            
        # Create a new blob and upload the file's content.
        my_file = bucket.blob(f'mr-file-mappings.txt')

        # create in memory file
        output = io.StringIO(json.dumps(dictMapping))

        # upload from string
        my_file.upload_from_string(output.read(), content_type="text/plain; charset=utf-8")

        output.close()
    else:
        return f'Please provide bucket name and start & end file no\'s'