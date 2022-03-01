const metrics = require('@overleaf/metrics')
const AnalyticsManager = require('./AnalyticsManager')
const SessionManager = require('../Authentication/SessionManager')
const GeoIpLookup = require('../../infrastructure/GeoIpLookup')
const Features = require('../../infrastructure/Features')

const getSegmentation = req => {
  const segmentation = req.body ? req.body.segmentation : null
  const cleanedSegmentation = {}
  if (
    segmentation &&
    segmentation.editorType &&
    typeof segmentation.editorType === 'string' &&
    segmentation.editorType.length < 100
  ) {
    cleanedSegmentation.editorType = segmentation.editorType
  }
  return cleanedSegmentation
}

module.exports = {
  updateEditingSession(req, res, next) {
    if (!Features.hasFeature('analytics')) {
      return res.sendStatus(202)
    }
    const userId = SessionManager.getLoggedInUserId(req.session)
    const { projectId } = req.params
    const segmentation = getSegmentation(req)
    let countryCode = null

    if (userId) {
      GeoIpLookup.getDetails(req.ip, function (err, geoDetails) {
        if (err) {
          metrics.inc('analytics_geo_ip_lookup_errors')
        } else if (geoDetails && geoDetails.country_code) {
          countryCode = geoDetails.country_code
        }
        AnalyticsManager.updateEditingSession(
          userId,
          projectId,
          countryCode,
          segmentation
        )
      })
    }
    res.sendStatus(202)
  },

  recordEvent(req, res, next) {
    if (!Features.hasFeature('analytics')) {
      return res.sendStatus(202)
    }
    delete req.body._csrf
    AnalyticsManager.recordEventForSession(
      req.session,
      req.params.event,
      req.body
    )
    res.sendStatus(202)
  },
}
