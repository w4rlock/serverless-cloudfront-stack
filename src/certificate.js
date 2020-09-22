const _ = require('lodash');

module.exports = {
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
   * Fetch Aws Acm Certificate List
   *
   * @returns {array} Certificate List
   */
  async fetchAcmCerts() {
    let acmCerts;

    try {
      acmCerts = await this.aws.request('ACM', 'listCertificates', {});
    } catch (err) {
      throw new Error('AWS_ACM_CERTS: Could not fetch acm certificates list');
    }

    return acmCerts.CertificateSummaryList;
  },
};
