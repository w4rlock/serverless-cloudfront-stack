const _ = require('lodash');

module.exports = {
  /**
   * Validate Aws Resources before deploy.
   *
   */
  async validateResources() {
    await this.validateBucketS3();
  },

  /**
   * Validate Buckets if exists. because CloudFormation Launch an exception
   * at runtime when is creating the stack and the bucket exists
   *
   */
  async validateBucketS3() {
    const stack = this.describeStack();

    if (_.isEmpty(stack)) {
      const appBucket = this.cfg.bucketName;
      const logBucket = _.get(this.cfg, 'logging.bucketName');

      await this.throwIfBucketExists(appBucket);
      await this.throwIfBucketExists(logBucket);
    }
  },

  /**
   * Throw an exception when the bucket exists.
   *
   * @param {string} bucketName Bucket Name to check
   */
  async throwIfBucketExists(bucketName) {
    if (!_.isEmpty(bucketName)) {
      this.log(`Validating s3 bucket "${bucketName}"`);

      const exists = await this.existsBucket(bucketName);

      if (exists) {
        let err = '';
        err += 'S3_BUCKET_EXISTS\n';
        err += 'Cannot create an existing resource. \n';
        err += 'Be Careful \n\n';
        err += `aws s3 rm s3://${bucketName} --recursive \n`;
        err += `aws s3 rb s3://${bucketName} \n`;

        throw new Error(err);
      }
    }
  },

  /**
   * Check if bucket exists
   *
   * @param {string} bucketName bucket name to check
   */
  async existsBucket(bucketName) {
    const aws = this.serverless.getProvider('aws');
    let res = false;

    try {
      await aws.request('S3', 'headBucket', { Bucket: bucketName });
      res = true;
    } catch (err) {
      res = false;
    }

    return res;
  },
};
