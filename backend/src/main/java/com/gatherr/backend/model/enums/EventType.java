package com.gatherr.backend.model.enums;

public enum EventType {
    SPECIFIC_DATES_AND_TIMES,
	SPECIFIC_DATES,
	WEEKDAYS,
	WEEKDAYS_AND_TIMES,
	/** Trip: each slot is a date range "ddMMyyyy-ddMMyyyy", answered as a whole (issue #148). */
	DATE_RANGES,
}
