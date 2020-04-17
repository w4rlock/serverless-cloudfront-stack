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
      msg += `You need to create a hosted zone from subdomain "${subdomain}". `;
      msg += 'Or check your subdomain name is right.';
      throw new Error(msg);
    }

    this.log(`Zone id: ${zoneId}`);
    return zoneId;
  },

  /**
   * Get aws arn for ACM SSL certificate
   * Ex:
   *   certName: dev.some.domain
   *   certName: *.dev.some.domain
   *   certName: new.poc.dev.some.domain
   *
   * @param {string} certName or sub domain name to resolve
   * @returns {string} acm certificate arn
   */
  async getCertificateArn(certName) {
    // reduce risk for names
    const fixCertName = (crt) => {
      if (crt.startsWith('*.')) return crt.substring(2);
      if (crt.startsWith('.')) return crt.substring(1);
      return crt;
    };

    const inCertificate = fixCertName(certName);

    this.log(`Fetching certificate arn id for certificate name "${certName}"`);
    const acmCertsList = await this.fetchAcmCerts();

    const certs = acmCertsList.filter((crt) =>
      inCertificate.endsWith(fixCertName(crt.DomainName))
    );

    if (_.isEmpty(certs)) {
      let msg = '';
      msg += 'AWS_ACM_CERT_NOT_FOUND:';
      msg += `Could not found your certificate for domain "${certName}"`;
      msg += 'Please go to aws console => acm.. and review';
      throw new Error(msg);
    }

    // match with the most long cert for this new domain.
    const cert = certs.reduce((a, b) =>
      a.DomainName.length > b.DomainName.length ? a : b
    );

    const { CertificateArn } = cert;
    this.log(`SSL Certificate arn: ${CertificateArn}`);

    return CertificateArn;
  },

  /**
   * Fetch Aws Acm Certificate List
   *
   * @returns {array} Certificate List
   */
  async fetchAcmCerts() {
    const creds = this.getAwsCredentials();
    const awsAcm = new this.serverless.providers.aws.sdk.ACM(creds);
    let acmCerts;

    try {
      acmCerts = await awsAcm.listCertificates({}).promise();
    } catch (err) {
      throw new Error('AWS_ACM_CERTS: Could not fetch acm certificates list');
    }

    return acmCerts.CertificateSummaryList;
  },

  /**
   * Describe Cloud Formation Stack
   *
   * @param {string} stackName='' by default take this stackname
   * @param {boolean} printPretty=true get relevant info formated
   */
  async describeStack(stackName = '', printPretty = true) {
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
      throw new Error('CF_STACK_ERROR', err);
    }

    if (printPretty) {
      const rawout = _.get(stackResult, 'Stacks[0].Outputs', []);
      const out = rawout.reduce(
        (obj, item) =>
          Object.assign(obj, { [item.OutputKey]: item.OutputValue }),
        {}
      );

      this.serverless.cli.log(
        `\nStack output:\n${JSON.stringify(out, undefined, 2)}`
      );
    }

    return stackResult;
  },
};
