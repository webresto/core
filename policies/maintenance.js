const moment = require('moment');

const between = require('../lib/causes').between;

module.exports = async function (req, res, next) {
    try {
        let maints = await Maintenance.find({enable: true});
        if (!maints.length) {
            return next();
        }
        sails.log.info(maints);
        maints = maints.filter(s => {
            let start, stop;
            if (s.startDate)
                start = s.startDate.getTime();
            if (s.stopDate)
                stop = s.stopDate.getTime();

            const now = moment().valueOf();
            return between(start, stop, now);
        });
        sails.log.info(maints);

        const maint = maints[0];
        if (maints.length) {
            return res.json(maint);
        } else {
            return next();
        }
    } catch (e) {
        return res.serverError(e);
    }
};
