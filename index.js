const _ = require('lodash');
const BaseServerlessPlugin = require('base-serverless-plugin');

const utils = require('./src/utils');
const externalPlugins = require('./src/externalPlugins');
const configureApiGateway = require('./src/configureApiGateway');
const loadConfig = require('./src/loadConfig');
const awsUtils = require('./src/aws.utils');
const certificate = require('./src/certificate');
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
    Object.assign(
      this,
      externalPlugins,
      loadConfig,
      utils,
      awsUtils,
      configureApiGateway,
      certificate,
      route53,
      validate
    );

    this.pluginPath = __dirname;
    this.onceInit = _.once(() => this.initialize());

    this.addExternalsPlugins();

    this.hooks = {
      'before:package:initialize': this.dispatchAction.bind(
        this,
        this.beforeInitialize
      ),
      'package:initialize': this.dispatchAction.bind(this, this.injectTemplate),
    };
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
    this.cfg.certificate = await this.handleCert();
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
      this.addResource(this.render('./resources/s3-logging.hbs', this.cfg));
    }

    if (!_.isEmpty(this.cfg.apigatewayStr)) {
      await this.configureApiGateway();
      this.addResource(this.render('./resources/apigateway.hbs', this.cfg));
    }

    this.addResource([
      this.render('./resources/s3-bucket.hbs', this.cfg),
      this.render('./resources/s3-policy.hbs', this.cfg),
      this.render('./resources/cloudfront-identify.hbs', this.cfg),
      this.render('./resources/cloudfront.hbs', this.cfg),
    ]);

    if (this.cfg.createInRoute53) {
      this.cfg.zoneId = await this.getHostedZoneId(this.cfg.cname);
      this.addResource(this.render('./resources/route53.hbs', this.cfg));
    }
  }

  /**
   * Add resources to Cloud Formation Resources
   *
   * @param {array|object} resource resources to add
   */
  addResource(resource) {
    const resources = [].concat(resource);
    const cf = this.serverless.service.provider.compiledCloudFormationTemplate;
    const allUsrRes = _.get(this.serverless, 'service.resources.Resources', {});

    resources.forEach((res) => {
      // extends template base support
      if (!_.isEmpty(res.Resources)) {
        // iteration object resources keys
        _.forEach(res.Resources, (val, key) => {
          const baseRes = res.Resources[key];
          const usrRes = allUsrRes[key];
          // user can override all templates properties
          if (!_.isEmpty(usrRes)) {
            _.merge(baseRes, usrRes);
          }
        });
      }

      _.merge(cf.Outputs, res.Outputs);
      _.merge(cf.Resources, res.Resources);
    });
  }
}

module.exports = ServerlessPlugin;
