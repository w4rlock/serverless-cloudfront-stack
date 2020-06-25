const dig = require('domain-info');

const CloudProvider = {
  AMAZON: 'AMAZON',
  CLOUDFLARE: 'CLOUDFLARE',
  UNKNOWN: 'UNKNOWN',
  NOT_FOUND: 'NOT_FOUND'
}


module.exports = {
  CloudProvider,

  /**
   * Resolve Cloud Provider Name
   *
   * @param {string} domain target domain
   * @returns {string} dns cloud provider name
   */
  async resolveCloudProvider(domain) {
    let res = ''
    const opt = {
      type: 'NS'
    }

    try {
      const inf = await dig.groper(domain, opt);
      if (inf && inf.NS) {
        inf.NS.forEach(ns => {
          if (ns.data.includes('awsdns')) {
            res = CloudProvider.AMAZON;
            return;
          }
          if (ns.data.includes('cloudflare')) {
            res = CloudProvider.CLOUDFLARE;
          }
        })
      }

      if (res === '') {
        res = CloudProvider.UNKNOWN
      }
    }
    catch(err) {
      res = CloudProvider.NOT_FOUND;
    }

    return res;
  }
}
