const _ = require('lodash');
const BaseServerlessPlugin = require('base-serverless-plugin');

const utils = require('./src/utils');
const externalPlugins = require('./src/externalPlugins');
const loadConfig = require('./src/loadConfig');
const awsUtils = require('./src/aws.utils');

const LOG_PREFFIX = '[ServerlessCdnStack] -';
const USR_CONF = 'cdnStack';


class ServerlessPlugin extends BaseServerlessPlugin {
  var a = 1;
  /**
   * Default Constructor
   *
   * @param {object} serverless the serverless instance
   * @param {object} options command line arguments
   */
  constructor(serverless, options) {
    super(serverless, options, LOG_PREFFIX, USR_CONF);
    Object.assign(this, externalPlugins, loadConfig, utils, awsUtils);

    this.pluginPath = __dirname;
    this.onceInit = _.once(() => this.initialize());
    this.addExternalsPlugins();

    this.hooks = {
      'package:initialize': this.dispatchAction.bind(this, this.injectTemplate),
    };
  }

  /**
   * Action Wrapper check plugin condition before perform action
   *
   * @param {function} funAction serverless plugin action
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
    // when use a cnme for cdn is required a ssl cert arn
    if (this.cfg.resolveCertificateArn) {
      this.cfg.certificate = await this.getCertificateArn(this.cfg.certificate);
    }

    this.addResource([
      this.render('./resources/s3-bucket.tpl.yml', this.cfg),
      this.render('./resources/s3-policy.tpl.yml', this.cfg),
      this.render('./resources/cloudfront-identify.tpl.yml', this.cfg),
      this.render('./resources/cloudfront.tpl.yml', this.cfg),
    ]);

    if (!_.isEmpty(this.cfg.logging)) {
      this.addResource(this.render('./resources/s3-logging.tpl.yml', this.cfg));
    }

    if (this.cfg.createInRoute53) {
      this.cfg.zoneId = await this.getHostedZoneId(this.cfg.cname);
      this.addResource(this.render('./resources/route53.tpl.yml', this.cfg));
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
      _.merge(cf, res);
    });
  }
}

module.exports = ServerlessPlugin;
