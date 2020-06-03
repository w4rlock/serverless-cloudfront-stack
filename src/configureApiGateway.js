const _ = require('lodash');

module.exports = {
  async configureApiGateway() {
    const apigwArr = this.cfg.apigatewayStr.split('/');

    if (apigwArr.length < 2) {
      let err = '\n';
      err += 'In serverless.yml: \n';
      err += 'ApiGateway syntax should be: \n\n';
      err += 'apigateway: "apigateway-name:stage/new-front1" \n';
      err += 'apigateway: "apigateway-name:stage/existent/path/to/new-front1" \n\n';

      throw new Error(err);
    }


    const [apiStg] = apigwArr
    const apiStgArr = apiStg.split(':')

    let stageMsgErr = '\n';
    stageMsgErr += 'In serverless.yml: \n';
    stageMsgErr += 'ApiGateway Stage is required ex.: \n\n';
    stageMsgErr += 'apigateway: "apigateway-name:stage/new-front1" \n\n';

    if (apiStgArr.length < 2) {
      throw new Error(stageMsgErr);
    }

    const [apiName, stage] = apiStgArr;
    if (_.isEmpty(stage)) {
      throw new Error(stageMsgErr);
    }

    const pathPart = apigwArr.slice(-1);
    let restPath = '/';
    if (apigwArr.length > 2) {
      restPath += apigwArr.slice(1, -1).join('/');
    }

    this.log(`[ApiGateway] - Searching rest api id: '${apiName}'`);
    const restApiId = await this.getRestApiId(apiName);
    this.log(restApiId);

    this.log(`[ApiGateway] - Searching rest path id: '${restPath}'`);
    const parentId = await this.getRestApiResourceId(restApiId, restPath);
    this.log(parentId);

    this.log(`[ApiGateway] - Validating stage: '${stage}'`);
    const stages = await this.getRestApiStages(restApiId);

    if (!stages.find(stg => stg === stage)) {
      let err = '\n';
      err += `ApiGateway Stage not found: '${stage}' \n`;
      err += `Stages found: ${JSON.stringify(stages)}\n\n`;
      err += `Change your serverless.yml:\napigateway: ${this.cfg.apigatewayStr} \n\n`


      throw new Error(err);
    }

    this.cfg.apigateway = {}
    this.cfg.apigateway.stage = stage
    this.cfg.apigateway.apiName = apiName
    this.cfg.apigateway.pathPart = pathPart
    this.cfg.apigateway.parentId = parentId
    this.cfg.apigateway.restApiId = restApiId
    // handlebars doesnot support native "!" for check for undefined value
    this.cfg.apigateway.createRestApi = _.isEmpty(restApiId);
    // eslint-disable-next-line
    this.cfg.apigateway.proxyEndpoint = '${CloudFrontDistribution.DomainName}';
  },
};
