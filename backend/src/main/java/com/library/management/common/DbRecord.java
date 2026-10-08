package com.library.management.common;

import java.util.LinkedHashMap;

/** A raw MyBatis row. Never return this type from an HTTP controller. */
public final class DbRecord extends LinkedHashMap<String,Object> {
}
