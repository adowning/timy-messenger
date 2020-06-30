'use strict';

const { db } = require('../admin');
const functions = require('firebase-functions');
const { getAllGroups } = require('../group-util');
const { pushToUser } = require('../push-send');
const { usersInChannel, getUser } = require('../user-util');
const { getNotificationTitleForUpcomingEvent,
  getNotificationBodyForUpcomingEvent } = require('../localize-util');
const https = require('https');
const info = functions.config().info;
/**
 * Returning a time string in the format h:mm
 *
 * @param {Timestamp} eventTimestamp: In UTC
 * @param {Int} timezoneSecondsOffset: Event timezone offset
 */
const timeStringForDate = (eventTimestamp, timezoneSecondsOffset) => {
  const offset = timezoneSecondsOffset * 1000;
  var eventStartDate = eventTimestamp.toDate();
  eventStartDate.setTime(eventStartDate.getTime() + offset);

  const hours = eventStartDate.getHours();
  var minutes = eventStartDate.getMinutes();
  minutes = (minutes < 10) ? `0${minutes}` : minutes;
  return `${hours}:${minutes}`;
}

/**
 * Will send a localized notification to all members subscribed to a channel.
 * The action is reported by setting the `notified_members` flag of the event channel to true.
 * 
 * @param {DocumentSnapshot} channelDocument 
 * @param {string} groupId 
 * @param {string} groupName
 * @param {bool} isTomorrow: Indicates if event is starting tomorrow or today.
 */
const pushToChannelMembers = async (channelDocument, groupId, groupName, isTomorrow = false) => {
  const channelUsers = await usersInChannel(groupId, channelDocument.id);
  const channelData = channelDocument.data();

  channelDocument.ref.update({
    notified_members: true
  });

  for (const userSnapshot of channelUsers.docs) {
    const uid = userSnapshot.data().uid;
    const userDoc = await getUser(uid);
    const locale = userDoc.data().locale;

    const localizedTimeString = timeStringForDate(channelData.start_date, channelData.timezone_seconds_offset);
    const title = getNotificationTitleForUpcomingEvent(locale, groupName);
    const body = getNotificationBodyForUpcomingEvent(locale, channelData.name, isTomorrow ? null : localizedTimeString);

    await pushToUser(userDoc.id, userDoc.data().token, title, body, "", groupId, channelDocument.id);
  }
}

const getTimeRange = async () => {
     const channelDocsQuery = db
    .collection('cron-times')
    .doc('event-schedule-servicemonster')
    const doc = await channelDocsQuery.get()
    const startTime = doc.get('timeStamp')
    let offset = new Date(this.valueOf());
    offset.setDate(offset.getDate() + 90);
    const endTime = startTime + offset
    return {startTime, endTime}
}
const getAllJobsSinceLastUpdate = async () => {
return new Promise((resolve, reject) => {
        const hostname = info.hostname;
        const pathname = info.pathname;
        let data = '';
        let {startTime, endTime } = getTimeRange()
        const request = https.get(`https://${hostname}${pathname}?startDate=${startTime}&endDate=${endTime}`, (res) => {
            res.on('data', (d) => {
                data += d.items;
            });
            res.on('end', resolve);
        });
        request.on('error', reject);
    });
}



const logUpdateTime = async () => {
   const channelDocsQuery = db
    .collection('cron-times')
    .doc('event-schedule-servicemonster')
    const now = new Date()
      return await channelDocsQuery.ref.update("timeStamp", now.valueOf());
}

const createEvents = async (smJobs) => {
  for (const smJob of smJobs) {
    // const groupName = groupDocument.data().name;
    // const groupId = groupDocument.id
    // const eventChannels = await getUpcomingEventChannels(groupId, hoursInFuture);
  
    // if (!eventChannels.empty) {
    //   await pushToEventChannelMembers(eventChannels.docs, groupId, groupName, hoursInFuture == -1);
    // }
  }
}

// Cron jobs
const runtimeOpts = {
  timeoutSeconds: 540, // firebase max of 9 minutes
}

const updateEventsWithServicemonsterJobs =
  functions.runWith(runtimeOpts)
    .region('us-central1')
    .pubsub
    .schedule('every 3 minutes')
    .timeZone('UTC')
    .onRun(async () => {
      const smJobs = await getAllJobsSinceLastUpdate();
      await createEvents(smJobs);
    });

module.exports = {
  updateEventsWithServicemonsterJobs
}
