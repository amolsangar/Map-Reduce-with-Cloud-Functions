#!/bin/bash
project=$(gcloud config get-value project)
echo "Project - $project"

api=$(gcloud services enable cloudbuild.googleapis.com)
echo $api

build=$(gcloud builds submit --tag gcr.io/${project}/search:1.0.0)
echo $build

deploy=$(gcloud run deploy --image=gcr.io/${project}/search:1.0.0 --platform managed)
echo $deploy

list=$(gcloud run services list)
echo $list

printf "Website Deployment Complete\n"