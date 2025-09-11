// Tasks
export const TASKS = {
  USER: {
    id: 0,
    siteId: 83,
    url: "https://www.shiftgen.com/member/multi_site_schedule",
    schedule: "CHOC Scribe"
  },
  DOCTOR: {
    id: 1,
    siteId: 80,
    url: "https://www.shiftgen.com/admin/index",
    schedule: "St Joseph/CHOC Physician"
  },
  PA: {
    id: 2,
    siteId: 84,
    url: "https://www.shiftgen.com/admin/index",
    schedule: "St Joseph/CHOC MLP"
  }
}

export const PROVIDER_ENUM = {
  UNKNOWN: 0,
  DOCTOR: 1,
  PA: 2
}

export const STATE = {
  IDLE: 0,
  CREATE_TAB_USER: 1,
  CREATE_TAB_PROVIDER: 2,
  CHANGE_SCHEDULE_USER: 3,
  CHANGE_SCHEDULE_PA: 4,
  CHANGE_SCHEDULE_DOCTOR: 5,
  NAVIGATING: 6,
  RUNNING: 7,
  COMPLETED: 8,
}