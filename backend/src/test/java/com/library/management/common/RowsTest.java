package com.library.management.common;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.Map;
import org.junit.jupiter.api.Test;

class RowsTest {
    @Test void detachesDatabaseRowIntoApiProjection() {
        DbRecord database=new DbRecord();
        database.put("book_id",42L);database.put("nullable_field",null);
        ApiRecord api=Rows.row(database);
        assertThat(api).isNotSameAs(database).containsEntry("bookId",42L).containsEntry("nullableField",null);
        database.put("book_id",43L);
        assertThat(api.get("bookId")).isEqualTo(42L);
    }
}
