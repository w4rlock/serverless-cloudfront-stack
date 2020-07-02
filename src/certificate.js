const _ = require('lodash');

const Status = {
  ISSUED: 'ISSUED',
  PENDING_VALIDATION: 'PENDING_VALIDATION',
};

module.exports = {
  /**
   * Handle Certificate Creation
   *
   */
  async handleCert() {
    let zoneId;
    let certificateArn;

    try {
      zoneId = await this.getHostedZoneId(this.cfg.cname);
      // eslint-disable-next-line
    } catch (e) {}

    // user can forced to use an specific arn!
    // useful for duplicates certs.
    if (this.cfg.resolveCertificateArn) {
      // when use a cname for cdn is required a ssl cert arn
      certificateArn = await this.createCertificateIfNeed(this.cfg.certificate);
      // if cert domain is amazon.. this will create dns record to validate it
      const cert = await this.describeCertificateByArn(certificateArn);

      if (cert.Status === Status.PENDING_VALIDATION) {
        const rec = cert.DomainValidationOptions.find(
          (dns) => this.cfg.certificate === dns.DomainName
        );

        // if hosted zone exists will create records to validate certificate
        // if not exits maybe domain is handled for another cloud provider
        if (zoneId) {
          await this.upsertDnsRecord(zoneId, rec.ResourceRecord);
          const region = this.getRegion();

          let msg = '\n';
          msg += '=======================================================\n';
          msg += 'The DNS record was written to your Route 53 hosted zone.\n';
          msg += 'It can take 30 minutes or longer for the changes to \n';
          msg += 'propagate and for AWS to validate the domain and issue \n';
          msg += 'the certificate. \n';
          msg += '=======================================================\n';
          msg += 'https://console.aws.amazon.com/acm/home?region=';
          msg += region;
          msg += '\n\n';

          this.log(msg);

          // 180 retries every 20 seconds (timeout max 60min)
          await this.waitForIssueCertificate(180, certificateArn);
        } else {
          let msg = '\n\n';
          msg += 'To Certificate validation ';
          msg += 'Create next record in your dns provider. \n';
          msg += `${rec.Name}  ${rec.Type}  ${rec.Value} \n`;

          this.log(msg);
        }
      }
    }

    return certificateArn;
  },

  /**
   * Wait for acm certificate validation (ISSUED)
   *
   * @param {string} max retries every 20 seconds
   * @param {string} certificateArn certificate arn
   * @returns {string} current certificate status
   */
  async waitForIssueCertificate(retries, certificateArn) {
    const cert = await this.describeCertificateByArn(certificateArn);

    if (cert && cert.Status !== Status.ISSUED) {
      // sleep 20 seconds every request
      let msg = '';
      msg += `Retries left: "${retries}" - `;
      msg += `Certificate Status: ${cert.Status}`;
      this.log(msg);

      await this.sleep(20000);
      return this.waitForIssueCertificate(retries - 1, certificateArn);
    }

    return Status;
  },

  /**
   * Get aws arn for ACM SSL certificate
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

    this.log(`Searching certificate for domain name "${certName}"`);
    const acmCertsList = await this.fetchAcmCerts();

    const cert = acmCertsList.find(
      (crt) => inCertificate === fixCertName(crt.DomainName)
    );

    if (_.isEmpty(cert)) {
      return undefined;
    }

    this.log(`SSL Certificate arn: ${cert.CertificateArn}`);
    return cert.CertificateArn;
  },

  /**
   * Create acm certificate if not exists (https support)
   *
   * @param {string} certificateName certificate wildcard name
   * @returns {string} certificate arn
   */
  async createCertificateIfNeed(certificateName) {
    let crtArn = await this.getCertificateArn(certificateName);

    if (!crtArn) {
      this.log(`Certificate "${certificateName}" not found.`);
      this.log('Creating new certificate.');
      crtArn = await this.createCertificate(certificateName);

      this.log('Waiting 20 seconds for certificate creation.');
      await this.sleep(20000);
      this.log('The certificate will be ready after dns validation (30min)');
    }

    return crtArn;
  },

  /**
   * Create Acm Certificate (https support)
   *
   * @param {string} certificateName certificate wildcard name
   * @returns {promise} certificate arn
   */
  async createCertificate(certificateName) {
    const creds = this.getAwsCredentials();
    const acm = new this.serverless.providers.aws.sdk.ACM(creds);

    const params = {
      DomainName: certificateName,
      ValidationMethod: 'DNS',
    };

    const resp = await acm.requestCertificate(params).promise();
    return resp.CertificateArn;
  },


  /**
   * Get Acm Certificate
   *
   * @param {string} certificateArn certificate arn
   * @returns {object } certificate
   */
  async describeCertificateByArn(certificateArn) {
    const creds = this.getAwsCredentials();
    const acm = new this.serverless.providers.aws.sdk.ACM(creds);
    const certificate = await acm
      .describeCertificate({ CertificateArn: certificateArn })
      .promise();

    return certificate && certificate.Certificate
      ? certificate.Certificate
      : null;
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
};
