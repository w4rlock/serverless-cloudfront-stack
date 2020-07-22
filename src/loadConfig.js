const _ = require('lodash');

module.exports = {
  /**
   * Load user config
   *
   */
  loadConfig() {
    this.cfg = {};
    this.cfg.bucketName = this.getConf('bucketName');
    this.cfg.syncLocalFolder = this.getConf('syncLocalFolder', false);

    this.cfg.cname = this.getConf('cname', '');

    // cname is nil do not create record !
    if (_.isEmpty(this.cfg.cname)) {
      this.cfg.createInRoute53 = false;
    } else {
      this.cfg.createInRoute53 = this.getConf('createInRoute53', false);
      // if use cname a ssl certificate is required
      this.cfg.certificate = this.getConf('certificate');
      // resolve certificate if certificate is a domain name
      this.cfg.resolveCertificateArn = !this.cfg.certificate.includes(
        'arn:aws:acm'
      );
    }

    // Optionals
    this.cfg.beforeSpawn = this.getConf('beforeSpawn', false);
    this.cfg.indexPage = this.getConf('indexPage', 'index.html');
    this.cfg.errorPage = this.getConf('errorPage', 'index.html');
    this.cfg.priceClass = this.getConf('priceClass', 'PriceClass_100');
    this.cfg.blockPublicAccess = this.getConf('blockPublicAccess', true);
    this.cfg.bucketEncryption = this.getConf('bucketEncryption', false);
    this.cfg.bucketVersioning = this.getConf('bucketVersioning', false);
    this.cfg.bucketWebHosting = this.getConf('bucketWebHosting', false);
    this.cfg.enableCors = this.getConf('enableCors', false);
    this.cfg.forwardHeaders = this.getConf('forwardHeaders', '');
    this.cfg.apigatewayStr = this.getConf('apigateway', '');

    // Web Application Firewall
    this.cfg.waf = this.getConf('waf', '');

    // Optionals
    this.cfg.logging = this.getConf('logging', {});
    if (!_.isEmpty(this.cfg.logging)) {
      // required if logging is set
      this.cfg.logging.bucketName = this.getConf('logging.bucketName');
      this.cfg.logging.preffix = this.getConf('logging.preffix', 'Access/');
      this.cfg.logging.retentionDays = this.getConf(
        'logging.retentionDays',
        21
      );

      this.cfg.logging.createBucketIfNeed = this.getConf(
        'logging.createBucketIfNeed',
        true
      );
    }
  },
};
