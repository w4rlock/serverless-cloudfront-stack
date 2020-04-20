<p align="center">
  <img alt="Aws Cdn" src="https://user-images.githubusercontent.com/621906/79572060-adf02b00-8092-11ea-9a43-76ba7f66a0a5.jpg">
</p>

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![npm version](https://badge.fury.io/js/serverless-cloudfront-stack.svg)](https://badge.fury.io/js/serverless-cloudfront-stack)
[![npm downloads](https://img.shields.io/npm/dt/serverless-cloudfront-stack.svg?style=flat)](https://www.npmjs.com/package/serverless-cloudfront-stack)


### Installation
```bash
npm i -E serverless-cloudfront-stack
```

### Features
```yaml
S3
- Bucket for your app assets.
- Bucket access control.
- Bucket encryption support for AES256.
- Bucket for cdn access logs.
- Data rentention by days for access logs.

Cloud Front Distribution
- SSL support.
- Access Logs.
- Cname support.

Route53
- Record for your CDN.

Extras
- Invalidate CloudFront cache on new deploys.
- Sync your local assets folder with s3 on new deploys.
- Extends resources. 
```
### Diagram

<p align="center">
  <img alt="Aws Designer" width="680" height="540" src="https://user-images.githubusercontent.com/621906/79576361-881a5480-8099-11ea-83f5-f138a415a237.png">
</p>

### Usage
```yaml
# serverless.yml

plugins:
  - serverless-cloudfront-stack

custom:
  cdnStack:
    disabled: false                               # optional, disabled this plugin
    beforeSpawn: ''                               # optional, run another hook plugin

    cname: ''                                     # optional, cname for cdn.
    createInRoute53: false                        # optional, default true, create cname record
    certificate: ''                               # required, if use cname

    bucketName: ''                                # required, app bucket name
    blockPublicAccess: true                       # optional, block public acccess to s3
    bucketEncryption: false                       # optional, bucket encryption for AES256

    indexPage: ''                                 # optional, default index.html
    errorPage: ''                                 # optional, error page

    syncLocalFolder: ''                           # required, folder path to sync with s3
    priceClass: ''                                # optional, default 'PriceClass_100'

    logging:                                      # optional tag
      bucketName: ''                              # required, logs bucket name
      preffix: ''                                 # optional, default 'Access/'
      retentionDays: 7                            # optional, default 21 days


# psss. check full example in serverless.example.yml file.
```

### Extends
```yaml
# serverless.yml

resources:
  Resources:
    StaticWebSiteBucket:
      Properties:
        BucketName: override bucket name
        ...
        
    DnsRecord:
      Properties:
        Comment: override comment
        ...
        
    CloudFrontDistribution:
      ...
      
    AccessLogsBucket:
      ...
      
```
