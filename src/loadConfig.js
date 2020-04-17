const _ = require('lodash');

module.exports = {
  /**
   * Load user config
   *
   */
  loadConfig() {
    this.cfg = {};
    this.cfg.bucketName = this.getConf('bucketName');
    this.cfg.syncLocalFolder = this.getConf('syncLocalFolder');

    this.cfg.cname = this.getConf('cname', false);

    // cname is nil do not create record !
    if (_.isEmpty(this.cfg.cname)) {
      this.cfg.createInRoute53 = false;
    } else {
      this.cfg.createInRoute53 = this.getConf('createInRoute53', false, true);
      // if use cname a ssl certificate is required
      this.cfg.certificate = this.getConf('certificate');
      // resolve certificate if certificate is a domain name
      this.cfg.resolveCertificateArn = !this.cfg.certificate.includes(
        'arn:aws:acm'
      );
    }


    // Optionals
    this.cfg.beforeSpawn = this.getConf('beforeSpawn', false);
    this.cfg.indexPage = this.getConf('indexPage', false, 'index.html');
    this.cfg.errorPage = this.getConf('errorPage', false, 'error.html');
    this.cfg.priceClass = this.getConf('priceClass', false, 'PriceClass_100');
    this.cfg.printStackOutput = this.getConf('printStackOutput', false, true);


    // Optionals
    this.cfg.logging = this.getConf('logging', false, {});
    if (!_.isEmpty(this.cfg.logging)) {
      // required if logging is set
      this.cfg.logging.bucketName = this.getConf('logging.bucketName');

      this.cfg.logging.preffix = this.getConf(
        'logging.preffix',
        false,
        'Access/'
      );

      this.cfg.logging.retentionDays = this.getConf(
        'logging.retentionDays',
        false,
        21
      );

      this.cfg.logging.createBucketIfNeed = this.getConf(
        'logging.createBucketIfNeed',
        false,
        true
      );
    }
  },
};
