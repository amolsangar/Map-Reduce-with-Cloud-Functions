#!/bin/bash
read -p "Enter region for cloud function deployment (eg: us-central1): " region
echo "Region - $region"

project=$(gcloud config get-value project)
echo "Project - $project"

# Bucket Creation
service_enable=$(gcloud services enable cloudbuild.googleapis.com)
bucket=$( gsutil mb -p $project -l $region -c STANDARD gs://mr-io-bucket/)
echo $bucket
bucket2=$( gsutil mb -p $project -l $region -c STANDARD gs://mr-results-bucket/)
echo $bucket2
printf "Bucket Creation Complete\n"

# Cloud Functions Deployment
cd download-project-gutenberg
fn1=$(gcloud functions deploy gcp_download_project_gutenberg --entry-point download_project_gutenberg --runtime python37 --trigger-http --allow-unauthenticated --timeout=540 --memory=512MB --region=$region)
echo $fn1

cd ../mapper-1
fn2=$(gcloud functions deploy map1 --entry-point mapper --runtime nodejs14 --trigger-http --allow-unauthenticated --timeout=540 --memory=512MB --region=$region)
echo $fn2

cd ../master
fn5=$(gcloud functions deploy master --entry-point startMapReduce --runtime nodejs14 --trigger-http --allow-unauthenticated --timeout=540 --region=$region --set-env-vars projectID=$project,region=$region)
echo $fn5

cd ../master-trigger-bucket
fn6=$(gcloud functions deploy masterTriggerBucket --entry-point masterTrigger --runtime nodejs14 --trigger-resource mr-results-bucket --trigger-event google.storage.object.finalize --allow-unauthenticated --timeout=540 --region=$region --set-env-vars projectID=$project,region=$region)
echo $fn6

cd ../reducer-1
fn7=$(gcloud functions deploy red1 --entry-point reducer --runtime nodejs14 --trigger-http --allow-unauthenticated --timeout=540 --memory=512MB --region=$region)
echo $fn7

cd ../reducer-result-combiner
fn10=$(gcloud functions deploy reduceResultCombiner --entry-point combineResult --runtime nodejs14 --trigger-http --allow-unauthenticated --timeout=540 --memory=512 --region=$region)
echo $fn10

cd ../search
fn11=$(gcloud functions deploy search --entry-point search --runtime nodejs14 --trigger-http --allow-unauthenticated --timeout=540 --memory=512 --region=$region)
echo $fn11

cd ../shuffle-and-sort
fn12=$(gcloud functions deploy s_n_s --entry-point shuffleAndSort --runtime nodejs14 --trigger-http --allow-unauthenticated --timeout=540 --memory=512 --region=$region)
echo $fn12

printf "Cloud Functions Deployment Complete\n"
