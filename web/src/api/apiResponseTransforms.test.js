
/**
 * Test uses real data from server (since that is useful).
 * $YOLO_APP_PW and $API_SERVER needs to be set locally or in .env.dev
 */

import _ from 'lodash'
import { groupBuildsByMr, getLatestMasterBuildsForProjects, flagBuildsFirstOfDay } from './apiResponseTransforms'
import { buildListRequest } from './requests'
import { BRANCH } from '../constants'

const { resolve } = require('path')

require('dotenv').config({ path: resolve(__dirname, '../../.env.dev') })

let realBuildList = []
let realGroupedByMrBuildList = []

const apiKey = btoa(process.env.YOLO_APP_PW)


describe('groupBuildsByMr (no params in query)', () => {
  beforeAll(async (done) => {
    const DEFAULT_QUERY = {}
    if (apiKey) {
      try {
        const realResponse = await buildListRequest({
          apiKey,
          queryObject: DEFAULT_QUERY,
        })
        const { data: { builds: realBuilds = [] } = { realBuilds: [] } } = realResponse || {}
        realBuildList = realBuilds
        realGroupedByMrBuildList = groupBuildsByMr(realBuildList)
        done()
      } catch (e) {
        console.error(`ERROR: Error fetching data, make sure you have $YOLO_APP_PW in your local environment and "${process.env.API_SERVER}" is a valid endpoint`)
        console.error(e)
        done()
      }
    } else {
      console.error('ERROR: You neeed $YOLO_APP_PW in your local environment to make real tests that call the server')
      done()
    }
    afterAll(() => {
      realBuildList = []
      realGroupedByMrBuildList = []
    })
  })
  it('we have a buildlist from server with at least one item (or this suite is pointless)', () => {
    expect(realBuildList.length).toBeGreaterThan(0)
  })
  it('should be using a result list with at least two items with the same MR id (or this suite is pointless)', () => {
    const originalListMrIds = realBuildList.map(b => b.has_mergerequest_id)
    const uniqueMrIdsInOriginalBuildList = _.uniq(originalListMrIds)
    expect(originalListMrIds.length).toBeGreaterThan(uniqueMrIdsInOriginalBuildList.length)
  })
  it('should have an allBuildsForMr to each item', () => {
    const everyItemHasAKey = (array, key) => (!!array.every((el) => typeof el === 'object' && Object.keys(el).includes(key)))
    expect(everyItemHasAKey(realGroupedByMrBuildList, 'allBuildsForMr')).toBeTruthy()
  })
  it('should have the length of unique MR IDs + length of builds without MR', () => {
    const uniqueMergeRequestIds = _.uniq(realBuildList.map((b) => b.has_mergerequest_id).filter((mrId) => !!mrId))
    const numberOfBuildsWithoutMr = realBuildList.filter((b) => !b.has_mergerequest_id).length
    expect(realGroupedByMrBuildList.length).toEqual(uniqueMergeRequestIds.length + numberOfBuildsWithoutMr)
  })
  it('should have a has_mergerequest_id matching each unique ID in raw build list', () => {
    const uniqueMergeRequestIds = _.uniq(realBuildList.map((b) => b.has_mergerequest_id).filter((mrId) => !!mrId))
    const groupedByMrsBuildListMr = realGroupedByMrBuildList.map((b) => b.has_mergerequest_id).filter((b) => !!b)
    expect(uniqueMergeRequestIds.every((mrId) => groupedByMrsBuildListMr.includes(mrId))).toBeTruthy()
  })
})

let latestMasterBuildsPerProject = []

describe('getLatestMasterBuildsForProjects ({build_driver: [2, 3]})', () => {
  beforeAll(async (done) => {
    const DEFAULT_QUERY = { build_driver: [2, 3] }
    if (apiKey) {
      try {
        const realResponse = await buildListRequest({
          apiKey,
          queryObject: DEFAULT_QUERY,
        })
        const { data: { builds: realBuilds = [] } = { realBuilds: [] } } = realResponse || {}
        realBuildList = realBuilds
        realGroupedByMrBuildList = groupBuildsByMr(realBuildList)
        latestMasterBuildsPerProject = getLatestMasterBuildsForProjects(realGroupedByMrBuildList)
        done()
      } catch (e) {
        console.error(`ERROR: Error fetching data, make sure you have $YOLO_APP_PW in your local environment and "${process.env.API_SERVER}" is a valid endpoint`)
        console.error(e)
        done()
      }
    } else {
      console.error('ERROR: You neeed $YOLO_APP_PW in your local environment to make real tests that call the server')
      done()
    }
    afterAll(() => {
      realBuildList = []
      realGroupedByMrBuildList = []
      latestMasterBuildsPerProject = []
    })
  })
  it('we have a buildlist from server with at least one item (or this suite is pointless)', () => {
    expect(realBuildList.length).toBeGreaterThan(0)
  })
  it('I just realized this function is bad', () => {
    expect(latestMasterBuildsPerProject.every(item => typeof item === 'number')).toBeTruthy()
  })
})

let firstDayBuilds = []

describe('getLatestMasterBuildsForProjects ({build_driver: [1], limit: 20})', () => {
  beforeAll(async (done) => {
    const DEFAULT_QUERY = { build_driver: [1], limit: 20 }
    if (apiKey) {
      try {
        const realResponse = await buildListRequest({
          apiKey,
          queryObject: DEFAULT_QUERY,
        })
        const { data: { builds: realBuilds = [] } = { realBuilds: [] } } = realResponse || {}
        realBuildList = realBuilds
        firstDayBuilds = flagBuildsFirstOfDay(realBuilds)

        done()
      } catch (e) {
        console.error(`ERROR: Error fetching data, make sure you have $YOLO_APP_PW in your local environment and "${process.env.API_SERVER}" is a valid endpoint`)
        console.error(e)
        done()
      }
    } else {
      console.error('ERROR: You neeed $YOLO_APP_PW in your local environment to make real tests that call the server')
      done()
    }
    afterAll(() => {
      realBuildList = []
      firstDayBuilds = []
    })
  })
  it('gives "buildIsFirstOfDay" key to all builds', () => {
    expect(firstDayBuilds.every(b => _.keys(b).includes('buildIsFirstOfDay'))).toBeTruthy()
  })
  it('has at least one build that is buildIsFirstOfDay to be true', () => {
    expect(firstDayBuilds.some(b => b['buildIsFirstOfDay'])).toBeTruthy()
  })
})
