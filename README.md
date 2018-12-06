# 🦌 Rendeer
When Puppeteer meets Prerender

## Lint
```
npm run lint
```

## Run
```
npm run start
```

## Deploy AWS Elastic Beanstalk
```
pip install awsebcli
eb init Rendeer -r ap-southeast-1 -p "arn:aws:elasticbeanstalk:ap-southeast-1::platform/Docker running on 64bit Amazon Linux/2.12.5"
eb deploy
```

## Deploy Google Cloud Functions
```

sudo apt-get update && sudo apt-get install google-cloud-sdk
gcloud init
gcloud beta functions deploy rendeer --trigger-http --entry-point rendeer --region asia-northeast1 --runtime nodejs8 --memory 2048MB --timeout 65
```

## Fetch URL Usage
```
http://localhost:3000/?fetch=https://lesterchan.net
http://localhost:3000/https://lesterchan.net
```

## Clear Memcached Usage
```
http://localhost:3000/?clear=https://lesterchan.net
http://localhost:3000/clear/https://lesterchan.net
```

## Credits
* [Chee Aun's Puppetron](https://github.com/cheeaun/puppetron)
* [Rendertron](https://github.com/GoogleChrome/rendertron)
