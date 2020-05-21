const _ = require('lodash');
const ServerlessCloudfrontInvalidate = require('serverless-cloudfront-invalidate');
const ServerlessS3Sync = require('serverless-s3-sync');

module.exports = {
  /**
   * Add Third Party Plugins to serverless lifecycle
   *
   */
  addExternalsPlugins() {
    if (!_.isEmpty(this.cfg.syncLocalFolder)) {
      this.serverless.pluginManager.addPlugin(ServerlessS3Sync);
    }
    this.serverless.pluginManager.addPlugin(ServerlessCloudfrontInvalidate);
  },

  /**
   * Third Party Plugins Configuration
   *
   */
  configureExternalPlugins() {
    if (!_.isEmpty(this.cfg.syncLocalFolder)) {
      const s3Sync = [
        {
          bucketName: this.cfg.bucketName,
          localDir: this.cfg.syncLocalFolder,
        },
      ];
      _.merge(this.serverless.service.custom, { s3Sync });
    }

    const cloudfrontInvalidate = {
      distributionIdKey: 'CloudFrontDistributionId',
      items: ['/*'],
    };

    _.merge(this.serverless.service.custom, { cloudfrontInvalidate });
  },
};
