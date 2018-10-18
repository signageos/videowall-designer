const RestApi = require('@signageos/test/dist/RestApi/RestApi').default;

/**
 * @param {Array.<{ index: Number, deviceUid: String, uri: String }>} videos
 * @param {Object} [auth]
 * @param {String} [auth].clientId
 * @param {String} [auth].secret
 * @param {String} [appletUid]
 * @param {String} [appletVersion]
 * @param {String} [apiUrl]
 * @param {String} [syncGroup]
 * @param {String} [syncServer]
 */
module.exports = exports = {
    async setupVideoTimings(
        videos,
        auth = {
            clientId: 'fcbbd714b3f794987b1f1a730d52fa31ddbcb51a087919ea47',
            secret: '9d5e257e02691412fa83eb3c256910609ba62fa68df0117479a4865e36bfe1c9',
        },
        appletUid = 'c790b56805154b80e12309453ee2c387511179106563165848',
        appletVersion = '1.0.0',
        apiUrl = 'http://api.kiera.office.signageos.io',
        syncGroup = 'video-' + Math.random(),
        syncServer,
    ) {
        const sos = new RestApi({
            url: apiUrl,
            version: 'v1',
            auth,
        });
        const nowDate = new Date();
        for (const video of videos) {
            await sos.timing.create({
                deviceUid: video.deviceUid,
                appletUid,
                appletVersion,
                configuration: {
                    identification: 'video-' + video.index,
                    sync_server: syncServer,
                    sync_group: syncGroup,
                    video_uri: video.uri,
                },
                startsAt: nowDate,
                endsAt: nowDate,
                finishEvent: {
                    type: 'DURATION',
                    data: null,
                },
                position: 1,
            })
        }
    },
};
