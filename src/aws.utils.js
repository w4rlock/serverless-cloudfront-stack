const _ = require('lodash');

module.exports = {
  /**
   * Get aws credentials
   *
   */
  getAwsCredentials() {
    const region = this.serverless.providers.aws.getRegion();
    const creds = this.serverless.providers.aws.getCredentials();

    if (_.isEmpty(creds)) {
      throw new Error('Serverless credentials is empty');
    }

    return { ...creds, region };
  },

  /**
   * Get hosted zone id for subdomain name
   *
   * @param {string} subdomain subdomain name
   * @returns {string } zone id
   */
  async getHostedZoneId(subdomain) {
    let zoneId;
    let newDomain = subdomain;

    if (newDomain.endsWith('.')) newDomain = newDomain.slice(0, -1);

    const creds = await this.getAwsCredentials();
    this.awsRoute53 = new this.serverless.providers.aws.sdk.Route53(creds);
    this.log(`Fetching hosted zone id for subdomain name "${subdomain}"`);

    try {
      const zones = await this.awsRoute53.listHostedZones({}).promise();
      const hzone = zones.HostedZones.find((z) => {
        let currentZone = z.Name;
        if (currentZone.endsWith('.')) currentZone = currentZone.slice(0, -1);
        return newDomain.includes(currentZone);
      });

      if (hzone) {
        [, , zoneId] = hzone.Id.split('/');
      }
    } catch (err) {
      throw new Error('Could not fetch route53 HostedZones list');
    }

    if (!zoneId) {
      let msg = '';

      msg += 'HOSTED_ZONE_NOT_FOUND:';
      msg += 'To create a route53 record is required a hosted zone.';
      msg += `You need to create a hosted zone for subdomain "${subdomain}". `;
      msg += 'Or check your subdomain name is right.';
      throw new Error(msg);
    }

    this.log(`Zone id: ${zoneId}`);
    return zoneId;
  },


  /**
   * Describe Cloud Formation Stack
   *
   * @param {string} stackName='' by default take this stackname
   * @param {boolean} printPretty=true get relevant info formated
   */
  async describeStack(stackName = '') {
    const provider = this.serverless.getProvider('aws');
    let stack = stackName;

    if (_.isEmpty(stack)) {
      stack = provider.naming.getStackName();
    }

    let stackResult;
    try {
      stackResult = await provider.request('CloudFormation', 'describeStacks', {
        StackName: stack,
      });
    } catch (err) {
      stackResult = ''
    }

    return stackResult;
  },


  /**
   * Print Cloud Formation Stack Outputs
   *
   * @param {string} stackName='' Stack name
   */
  async printStackOutputs(stackName = ''){
    const stackResult = this.describeStack(stackName);
    const rawout = _.get(stackResult, 'Stacks[0].Outputs', []);
    const out = rawout.reduce(
      (obj, item) =>
        Object.assign(obj, { [item.OutputKey]: item.OutputValue }),
      {}
    );

    this.serverless.cli.log(
      `\nStack output:\n${JSON.stringify(out, undefined, 2)}`
    );
  },


  /**
   * Get ApiGateWay Rest API Id
   *
   * @param {string} restApiName rest api name
   * @returns {string} id rest api
   */
  async getRestApiId(restApiName) {
    const provider = this.serverless.getProvider('aws');
    const { items } = await provider.request('APIGateway', 'getRestApis', {});

    if (!items || items.length < 1) {
      throw new Error(
        `serverless.yml: API_GATEWAY_NOT_FOUND: '${restApiName}'`
      );
    }

    const api = items.find((it) => it.name === restApiName);
    if (_.isEmpty(api)) {
      throw new Error(
        `serverless.yml: API_GATEWAY_NOT_FOUND: '${restApiName}'`
      );
    }

    return api.id;
  },

  /**
   * Get ApiGateWay Rest API Resource Id
   *
   * @param {string} restApiId rest api id
   * @param {string} restApiPath rest api path
   * @returns {string} id parent rest api
   */
  async getRestApiResourceId(restApiId, restApiPath) {
    const provider = this.serverless.getProvider('aws');
    const { items } = await provider.request('APIGateway', 'getResources', {
      restApiId,
    });

    if (!items || items.length < 1) {
      throw new Error(
        `[ApiGateway] serverless.yml: REST_API_NOT_FOUND: ${restApiId}`
      );
    }

    const api = items.find((it) => it.path === restApiPath);
    if (_.isEmpty(api)) {
      throw new Error(
        `[ApiGateway] serverless.yml: API_PATH_NOT_FOUND: ${restApiPath}`
      );
    }

    return api.id;
  },

  /**
   * Get Stages for api rest
   *
   * @param {string} restApiId rest api id
   * @returns {array} stages
   */
  async getRestApiStages(restApiId) {
    const provider = this.serverless.getProvider('aws');

    // TODO: aws return "item" not "items"
    const { item } = await provider.request('APIGateway', 'getStages', {
      restApiId,
    });

    if (!item || item.length < 1) {
      const errCode = 'REST_API_STAGE_NOT_FOUND';
      throw new Error(
        `[ApiGateway] serverless.yml: ${errCode} for api rest: '${restApiId}'`
      );
    }

    return item.map((it) => it.stageName);
  },
};
