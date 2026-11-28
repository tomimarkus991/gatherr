package com.gatherr.backend.model;

/** Optional label and link for one range of a trip event, e.g. "Rome, Ryanair €89" (issue #148). */
public record RangeDetail(String label, String link) {}
