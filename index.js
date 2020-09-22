const _ = require('lodash');
const BaseServerlessPlugin = require('base-serverless-plugin');
const cloudFrontInvalidatePlugin = require('serverless-cloudfront-invalidate');
const s3SyncPlugin = require('serverless-s3-sync');
const certificate = require('./src/certificate');

const utils = require('./src/utils');
const externalPlugins = require('./src/externalPlugins');
const configureApiGateway = require('./src/configureApiGateway');
const loadConfig = require('./src/loadConfig');
const awsUtils = require('./src/aws.utils');
const route53 = require('./src/route53');
const validate = require('./src/validate');

const LOG_PREFFIX = '[ServerlessCdnStack] -';
const USR_CONF = 'cdnStack';

class ServerlessPlugin extends BaseServerlessPlugin {
  /**
   * Default Constructor
   *
   * @param {object} serverless the serverless instance
   * @param {object} options command line arguments
   */
  constructor(serverless, options) {
    super(serverless, options, LOG_PREFFIX, USR_CONF);

    this.pluginPath = __dirname;

    Object.assign(
      this,
      certificate,
      externalPlugins,
      loadConfig,
      utils,
      awsUtils,
      configureApiGateway,
      route53,
      validate
    );

    this.onceInit = _.once(() => this.initialize());

    this.hooks = {
      'before:package:initialize': this.dispatchAction.bind(
        this,
        this.beforeInitialize
      ),
      'package:initialize': this.dispatchAction.bind(this, this.injectTemplate),
    };
  }

  /**
   * Add plugins after me
   *
   */
  asyncInit() {
    this.addPlugins([cloudFrontInvalidatePlugin, s3SyncPlugin]);
  }

  /**
   * Action Wrapper check plugin condition before perform action
   *
   * @param {function} funAction serverless plugin action
   *
   */
  async dispatchAction(funAction, varResolver = undefined) {
    if (this.isPluginDisabled()) {
      this.log('warning: plugin is disabled');
      return '';
    }

    await this.onceInit();

    return funAction.call(this, varResolver);
  }

  /**
   * Before Deploy Hooks
   *
   */
  async beforeInitialize() {
    await this.validateResources();
    if (this.isCertificateWithDomainName(this.cfg.certificate)) {
      this.cfg.certificate = await this.getCertificateArn(this.cfg.certificate);
    }
  }

  /**
   * Initialize and call another hook plugin
   *
   * @returns {promise} another hook plugin promise if need
   */
  async initialize() {
    this.loadConfig();
    this.configureExternalPlugins();

    if (!_.isEmpty(this.cfg.beforeSpawn)) {
      return this.serverless.pluginManager.spawn(this.cfg.beforeSpawn);
    }

    return Promise.resolve();
  }

  /**
   * Add yml templates rendered on demand
   * to CloudFormation template
   *
   */
  async injectTemplate() {
    if (!_.isEmpty(this.cfg.logging.bucketName)) {
      this.mergeCFormationResources(
        this.render('./resources/s3-logging.hbs', this.cfg)
      );
    }

    if (!_.isEmpty(this.cfg.apigatewayStr)) {
      await this.configureApiGateway();
      this.mergeCFormationResources(
        this.render('./resources/apigateway.hbs', this.cfg)
      );
    }

    this.mergeCFormationResources([
      this.render('./resources/s3-bucket.hbs', this.cfg),
      this.render('./resources/s3-policy.hbs', this.cfg),
      this.render('./resources/cloudfront-identify.hbs', this.cfg),
      this.render('./resources/cloudfront.hbs', this.cfg),
    ]);

    if (this.cfg.createInRoute53) {
      this.cfg.zoneId = await this.getHostedZoneId(this.cfg.cname);
      this.mergeCFormationResources(
        this.render('./resources/route53.hbs', this.cfg)
      );
    }
  }
}

module.exports = ServerlessPlugin;
