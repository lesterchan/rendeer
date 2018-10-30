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

## Deploy
```
sudo apt-get update && sudo apt-get install google-cloud-sdk
gcloud init
gcloud beta functions deploy rendeer --trigger-http --entry-point rendeer --region asia-northeast1 --runtime nodejs8 --memory 2048MB --timeout 65
```

## Credits
* [Chee Aun's Puppetron](https://github.com/cheeaun/puppetron)
* [Rendertron](https://github.com/GoogleChrome/rendertron)
