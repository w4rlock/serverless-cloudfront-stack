const _ = require('lodash');

module.exports = {
  /**
   * Validate Aws Resources before deploy.
   *
   */
  async validateResources() {
    await this.validateBucketS3()
  },

  /**
   * Validate Buckets if exists. because CloudFormation Launch an exception
   * at runtime when is creating the stack and the bucket exists
   *
   */
  async validateBucketS3() {
    const stack = this.describeStack();
    if (_.isEmpty(stack)) {
      const appBucket = this.cfg.bucketName
      const logBucket = this.logging.bucketName

      await this.throwIfBucketExists(appBucket)
      await this.throwIfBucketExists(logBucket)
    }
  },

  /**
   * Throw an exception when the bucket exists.
   *
   * @param {string} bucketName Bucket Name to check
   */
  async throwIfBucketExists(bucketName) {
    if (!_.isEmpty(bucketName)) {

      const exists = await this.existsBucket(this.cfg.bucketName)
      if (_.isEmpty(exists)) {
        throw new Error(`Bucket exits ${bucketName}`);
      }
    }
  },

  /**
   * Check if bucket exists
   *
   * @param {string} bucketName bucket name to check
   */
  async existsBucket(bucketName) {
    let res;
    const aws = this.serverless.getProvider('aws');

    try {
      res = await aws.request('s3', 'headBucket', { BucketName: bucketName })
    }
    catch(err) {
      res = ''
    }

    return res;
  }
}
