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
eb init Rendeer -r ap-southeast-1 -p "arn:aws:elasticbeanstalk:ap-southeast-1::platform/Docker running on 64bit Amazon Linux/2.12.4"
eb deploy
```

## Credits
* [Chee Aun's Puppetron](https://github.com/cheeaun/puppetron)
* [Rendertron](https://github.com/GoogleChrome/rendertron)
