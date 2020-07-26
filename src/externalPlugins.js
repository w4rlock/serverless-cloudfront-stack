const _ = require('lodash');

module.exports = {
  /**
   * Third Party Plugins Configuration
   *
   */
  configureExternalPlugins() {
    this.configureS3Sync();
    this.configureCloudFrontInvalidation();
    this.configureCertificate();
  },

  /**
   * Config for Sync a local folder with s3
   *
   */
  configureS3Sync() {
    if (!_.isEmpty(this.cfg.syncLocalFolder)) {
      const s3Sync = [
        {
          bucketName: this.cfg.bucketName,
          localDir: this.cfg.syncLocalFolder,
        },
      ];

      this.addDefaultCustomConfig({ s3Sync });
    }
  },

  /**
   * Config for CloudFront Cache Invalidation
   *
   */
  configureCloudFrontInvalidation() {
    const cloudfrontInvalidate = {
      distributionIdKey: 'CloudFrontDistributionId',
      items: ['/*'],
    };

    this.addDefaultCustomConfig({ cloudfrontInvalidate });
  },

  /**
   * Config for Acm Https Certificate Creation and Validation.
   *
   */
  configureCertificate() {
    const certificate = {
      disableLifecycleHooks: true,
      domain: this.cfg.cname,
      name: this.cfg.certificate,
    };

    this.addDefaultCustomConfig({ certificate });
  },
};
