# 🦌 Rendeer
When Puppeteer meets Prerender

## Lint
```
yarn run lint
```

## Run
```
yarn run start
```

## Deploy
```
pip install awsebcli
eb init Rendeer -r ap-southeast-1 -p "arn:aws:elasticbeanstalk:ap-southeast-1::platform/Docker running on 64bit Amazon Linux/2.7.3"
eb deploy
```

## Credits
* [Chee Aun's Puppetron](https://github.com/cheeaun/puppetron)
* [Rendertron](https://github.com/GoogleChrome/rendertron)
