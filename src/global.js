/**
 * @file global.js
 * @brief Global variables and objects used in the extension.
 */

const PROVIDER_ENUM = {
    UNKNOWN: 0,
    DOCTOR: 1,
    PA: 2
}

const SCRAPING_STATUS_ENUM = {
    INACTIVE: 0,
    STARTING: 1,
    USER: 2,
    DOCTOR: 3,
    PA: 4
}

const SITE_ID_ENUM = {
    USER: 83,
    PA: 84,
    DOCTOR: 80
}

const TEST_SHIFTS = {
    '1741561200000': {
        endTime: 1741591800000,
        location: 'PA',
        overnight: true,
        providerName: 'NISHIOKA',
        providerType: 2,
        startTime: 1741561200000
    },
    '1741638600000': {
        endTime: 1741669200000,
        location: 'South',
        overnight: false,
        providerName: 'SAINTGEORGES',
        providerType: 1,
        startTime: 1741638600000
    },
    '1741737600000': {
        endTime: 1741766400000,
        location: 'RED',
        overnight: true,
        providerName: 'ASSAF',
        providerType: 1,
        startTime: 1741737600000
    },
    '1741824000000': {
        endTime: 1741852800000,
        location: 'RED',
        overnight: true,
        providerName: 'ROGAN',
        providerType: 1,
        startTime: 1741824000000
    },
    '1742256000000': {
        endTime: 1742284800000,
        location: 'RED',
        overnight: true,
        providerName: 'SAINTGEORGES',
        providerType: 1,
        startTime: 1742256000000
    },
    '1742342400000': {
        endTime: 1742371200000,
        location: 'RED',
        overnight: true,
        providerName: 'ENGLAND',
        providerType: 1,
        startTime: 1742342400000
    },
    '1742425200000': {
        endTime: 1742455800000,
        location: 'PA',
        overnight: true,
        providerName: 'JIVAN',
        providerType: 2,
        startTime: 1742425200000
    },
    '1742860800000': {
        endTime: 1742889600000,
        location: 'RED',
        overnight: true,
        providerName: 'DICKSON',
        providerType: 1,
        startTime: 1742860800000
    },
    '1742959800000': {
        endTime: 1742990400000,
        location: 'PA',
        overnight: true,
        providerName: 'JIVAN',
        providerType: 2,
        startTime: 1742959800000
    },
    '1743049800000': {
        endTime: 1743080400000,
        location: 'South',
        overnight: true,
        providerName: 'JAYAMAHA',
        providerType: 1,
        startTime: 1743049800000
    },
    '1743395400000': {
        endTime: 1743426000000,
        location: 'North',
        overnight: true,
        providerName: 'JAYAMAHA',
        providerType: 1,
        startTime: 1743395400000
    }
}