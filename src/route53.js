const Joi = require('@hapi/joi');

const RecordSchema = Joi.object({
  Name: Joi.string().required(),
  Type: Joi.string().required(),
  Value: Joi.string().required(),
});


module.exports = {
  /**
   * Create records if not exists
   *
   * @param {string} zoneId hosted zone id
   * @param {object} record record object { Name, Type, Value }
   */
  async createRecordIfNeed(zoneId, record) {
    if (!zoneId) {
      throw new Error('param "zoneId" is required');
    }

    const { error } = RecordSchema.validate(record);
    if (error) {
      throw new Error(error);
    }

    const aws = this.serverless.getProvider('aws');
    const listOpts = {
      MaxItems: '10',
      HostedZoneId: zoneId,
      StartRecordName: record.Name,
    };

    const resp = await aws.request(
      'Route53',
      'listResourceRecordSets',
      listOpts
    );

    if (resp.ResourceRecordSets.length < 1) {
      const Changes = [
        {
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: record.Name,
            Type: record.Type,
            TTL: 300,
            ResourceRecords: [
              {
                Value: record.Value,
              },
            ],
          },
        },
      ]

      const recordOpts = {
        HostedZoneId: zoneId,
        ChangeBatch: { Changes },
      };

      await aws.request('Route53', 'changeResourceRecordSets', recordOpts);
    }
  },
};
