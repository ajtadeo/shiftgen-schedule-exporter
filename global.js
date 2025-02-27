const SUCCESS = 0;
const ERROR_USER_WORKDAYS_NOT_SET = 1;
const ERROR_INVALID_STATUS = 2;

const PROVIDER_ENUM = {
    UNKNOWN: 0,
    DOCTOR: 1,
    PA: 2
  }

const TEST_WORKDAYS = {
  "2025-03-09T15:00:00.000-08:00": {
      "endDateTime": "2025-03-09T23:30:00.000-08:00",
      "location": "PA",
      "overnight": true,
      "providerName": "NISHIOKA",
      "providerType": 2,
      "startDateTime": "2025-03-09T15:00:00.000-08:00"
  },
  "2025-03-10T12:30:00.000-08:00": {
      "endDateTime": "2025-03-10T21:00:00.000-08:00",
      "location": "South",
      "overnight": false,
      "providerName": "SAINTGEORGES",
      "providerType": 1,
      "startDateTime": "2025-03-10T12:30:00.000-08:00"
  },
  "2025-03-11T16:00:00.000-08:00": {
      "endDateTime": "2025-03-12T00:00:00.000-08:00",
      "location": "RED",
      "overnight": true,
      "providerName": "ASSAF",
      "providerType": 1,
      "startDateTime": "2025-03-11T16:00:00.000-08:00"
  },
  "2025-03-12T16:00:00.000-08:00": {
      "endDateTime": "2025-03-13T00:00:00.000-08:00",
      "location": "RED",
      "overnight": true,
      "providerName": "ROGAN",
      "providerType": 1,
      "startDateTime": "2025-03-12T16:00:00.000-08:00"
  },
  "2025-03-17T16:00:00.000-08:00": {
      "endDateTime": "2025-03-18T00:00:00.000-08:00",
      "location": "RED",
      "overnight": true,
      "providerName": "SAINTGEORGES",
      "providerType": 1,
      "startDateTime": "2025-03-17T16:00:00.000-08:00"
  },
  "2025-03-18T16:00:00.000-08:00": {
      "endDateTime": "2025-03-19T00:00:00.000-08:00",
      "location": "RED",
      "overnight": true,
      "providerName": "ENGLAND",
      "providerType": 1,
      "startDateTime": "2025-03-18T16:00:00.000-08:00"
  },
  "2025-03-19T15:00:00.000-08:00": {
      "endDateTime": "2025-03-19T23:30:00.000-08:00",
      "location": "PA",
      "overnight": true,
      "providerName": "JIVAN",
      "providerType": 2,
      "startDateTime": "2025-03-19T15:00:00.000-08:00"
  },
  "2025-03-24T16:00:00.000-08:00": {
      "endDateTime": "2025-03-25T00:00:00.000-08:00",
      "location": "RED",
      "overnight": true,
      "providerName": "DICKSON",
      "providerType": 1,
      "startDateTime": "2025-03-24T16:00:00.000-08:00"
  },
  "2025-03-25T19:30:00.000-08:00": {
      "endDateTime": "2025-03-26T04:00:00.000-08:00",
      "location": "PA",
      "overnight": true,
      "providerName": "FIX ME",
      "providerType": -1,
      "startDateTime": "2025-03-25T19:30:00.000-08:00"
  },
  "2025-03-26T20:30:00.000-08:00": {
      "endDateTime": "2025-03-27T05:00:00.000-08:00",
      "location": "South",
      "overnight": true,
      "providerName": "JAYAMAHA",
      "providerType": 1,
      "startDateTime": "2025-03-26T20:30:00.000-08:00"
  },
  "2025-03-30T20:30:00.000-08:00": {
      "endDateTime": "2025-03-31T05:00:00.000-08:00",
      "location": "North",
      "overnight": true,
      "providerName": "JAYAMAHA",
      "providerType": 1,
      "startDateTime": "2025-03-30T20:30:00.000-08:00"
  }
}
