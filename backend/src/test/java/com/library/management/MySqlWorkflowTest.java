package com.library.management;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.library.management.catalog.service.CatalogService;
import com.library.management.circulation.service.LoanService;
import com.library.management.common.ApiException;
import com.library.management.common.Rows;
import com.library.management.inventory.service.InventoryService;
import com.library.management.reservation.service.ReservationService;
import com.library.management.statistics.service.StatisticsService;
import com.library.management.user.mapper.UserMapper;
import com.library.management.user.service.UserService;
import com.library.management.user.service.UserWorkflowService;
import jakarta.servlet.http.Cookie;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.HexFormat;
import java.security.MessageDigest;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Testcontainers(disabledWithoutDocker=true)
class MySqlWorkflowTest {
    @Container static final MySQLContainer<?> DB=new MySQLContainer<>("mysql:8.4")
        .withDatabaseName("library_management_test").withUsername("library_test")
        .withPassword(UUID.randomUUID().toString());
    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
        if (!DB.isRunning()) DB.start();
        registry.add("spring.datasource.url",DB::getJdbcUrl);
        registry.add("spring.datasource.username",DB::getUsername);
        registry.add("spring.datasource.password",DB::getPassword);
    }
    @Autowired UserMapper userMapper;
    @Autowired UserService users;
    @Autowired CatalogService catalog;
    @Autowired InventoryService inventory;
    @Autowired LoanService loans;
    @Autowired ReservationService reservations;
    @Autowired StatisticsService statistics;
    @Autowired UserWorkflowService userWorkflow;
    @Autowired PasswordEncoder encoder;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    long admin, librarian, category;
    String adminPassword;
    @BeforeAll void seed() {
        adminPassword="T"+UUID.randomUUID();
        admin=insertUser("ADMIN",adminPassword);
        librarian=insertUser("LIBRARIAN","T"+UUID.randomUUID());
        category=Rows.id(catalog.saveCategory(null,"测试分类","T"+UUID.randomUUID().toString().substring(0,8),true,1,admin));
    }
    long insertUser(String role,String password) {
        Map<String,Object> row=new LinkedHashMap<>();row.put("username","t"+UUID.randomUUID().toString().replace("-","").substring(0,18));
        row.put("passwordHash",encoder.encode(password));row.put("displayName","测试用户");row.put("phone",null);
        row.put("role",role);row.put("status","ACTIVE");row.put("mustChangePassword",false);
        userMapper.insert(row);return ((Number)row.get("id")).longValue();
    }
    record Fixture(long bookId,long copyId,String barcode) {}
    Fixture book() {
        Map<String,Object> row=new LinkedHashMap<>();row.put("isbn",null);row.put("title","测试书 "+UUID.randomUUID());row.put("author","测试作者");
        row.put("publisher",null);row.put("publishedOn",null);row.put("description",null);row.put("categoryId",category);
        row.put("coverPath",null);row.put("keywords","test,library");row.put("enabled",true);
        long bookId=Rows.id(catalog.saveBook(null,row,librarian));
        String barcode="BT"+UUID.randomUUID().toString().replace("-","").substring(0,16);
        long copyId=Rows.id(inventory.add(bookId,List.of(barcode),"A-1",librarian).get(0));
        return new Fixture(bookId,copyId,barcode);
    }
    @Test void flywayMapperAndPersistence() {
        Fixture f=book();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM flyway_schema_history WHERE success=1",Integer.class)).isEqualTo(1);
        assertThat(catalog.book(f.bookId(),true).get("title")).isEqualTo(inventory.byBarcode(f.barcode()).get("bookTitle"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM book_copies WHERE id=?",Integer.class,f.copyId())).isEqualTo(1);
    }
    @Test void concurrentCheckoutAllowsExactlyOneWinner() throws Exception {
        Fixture f=book();long readerA=insertUser("READER","T"+UUID.randomUUID()),readerB=insertUser("READER","T"+UUID.randomUUID());
        CountDownLatch start=new CountDownLatch(1);
        Callable<Boolean> a=() -> {start.await();try {loans.checkout(librarian,readerA,f.barcode(),null);return true;}catch(ApiException ex){return false;}};
        Callable<Boolean> b=() -> {start.await();try {loans.checkout(librarian,readerB,f.barcode(),null);return true;}catch(ApiException ex){return false;}};
        var pool=Executors.newFixedThreadPool(2);
        try {
            var fa=pool.submit(a);var fb=pool.submit(b);start.countDown();
            assertThat((fa.get()?1:0)+(fb.get()?1:0)).isEqualTo(1);
        } finally {pool.shutdownNow();}
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM loans WHERE copy_id=? AND status='ACTIVE'",Integer.class,f.copyId())).isEqualTo(1);
        assertThat(inventory.byId(f.copyId()).get("status")).isEqualTo("BORROWED");
    }
    private <T> List<T> concurrent(List<Callable<T>> actions) throws Exception {
        CountDownLatch start=new CountDownLatch(1);
        var pool=Executors.newFixedThreadPool(actions.size());
        try {
            var futures=actions.stream().map(action -> pool.submit(() -> {start.await();return action.call();})).toList();
            start.countDown();
            List<T> results=new ArrayList<>();
            for(var future:futures) results.add(future.get(60,TimeUnit.SECONDS));
            return results;
        } finally {pool.shutdownNow();}
    }
    @Test void concurrentSameKeyCheckoutReplaysTheCommittedResult() throws Exception {
        Fixture f=book();long reader=insertUser("READER","T"+UUID.randomUUID());String key=UUID.randomUUID().toString();
        List<Callable<String>> actions=new ArrayList<>();
        for(int i=0;i<20;i++) actions.add(() -> loans.checkout(librarian,reader,f.barcode(),key).get("id").toString());
        assertThat(concurrent(actions)).hasSize(20).allMatch(id -> id.equals(String.valueOf(jdbc.queryForObject("SELECT id FROM loans WHERE copy_id=? AND status='ACTIVE'",Long.class,f.copyId()))));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM loans WHERE copy_id=?",Integer.class,f.copyId())).isEqualTo(1);
    }
    @Test void concurrentCheckoutsWithDistinctKeysRespectReaderLimit() throws Exception {
        long reader=insertUser("READER","T"+UUID.randomUUID());List<Callable<Boolean>> actions=new ArrayList<>();
        for(int i=0;i<20;i++) {Fixture f=book();actions.add(() -> {
            try {loans.checkout(librarian,reader,f.barcode(),UUID.randomUUID().toString());return true;}
            catch(ApiException ex) {assertThat(ex.code()).isEqualTo("BORROW_LIMIT_REACHED");return false;}
        });}
        assertThat(concurrent(actions).stream().filter(Boolean::booleanValue).count()).isEqualTo(5);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM loans WHERE reader_id=? AND status='ACTIVE'",Integer.class,reader)).isEqualTo(5);
    }
    @Test void concurrentReservationsWithDistinctKeysRespectReaderLimit() throws Exception {
        long reader=insertUser("READER","T"+UUID.randomUUID());List<Callable<Boolean>> actions=new ArrayList<>();
        for(int i=0;i<20;i++) {Fixture f=book();actions.add(() -> {
            try {reservations.create(reader,f.bookId(),UUID.randomUUID().toString());return true;}
            catch(ApiException ex) {assertThat(ex.code()).isEqualTo("RESERVATION_LIMIT_REACHED");return false;}
        });}
        assertThat(concurrent(actions).stream().filter(Boolean::booleanValue).count()).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM reservations WHERE reader_id=? AND status IN ('WAITING','READY')",Integer.class,reader)).isEqualTo(3);
    }
    @Test void concurrentReadersCanQueueWithoutLockingEachOthersUserRows() throws Exception {
        Fixture f=book();List<Callable<Long>> actions=new ArrayList<>();
        for(int i=0;i<20;i++) {long reader=insertUser("READER","T"+UUID.randomUUID());actions.add(() -> Rows.id(reservations.create(reader,f.bookId(),UUID.randomUUID().toString())));}
        assertThat(concurrent(actions)).hasSize(20);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM reservations WHERE book_id=? AND status='READY'",Integer.class,f.bookId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM reservations WHERE book_id=? AND status='WAITING'",Integer.class,f.bookId())).isEqualTo(19);
    }
    @Test void queueCancellationAndExpiryReassignInOrder() {
        Fixture f=book();long first=insertUser("READER","T"+UUID.randomUUID());long second=insertUser("READER","T"+UUID.randomUUID());long third=insertUser("READER","T"+UUID.randomUUID());
        long loanId=Rows.id(loans.checkout(librarian,first,f.barcode(),null));
        long secondHold=Rows.id(reservations.create(second,f.bookId(),null));
        long thirdHold=Rows.id(reservations.create(third,f.bookId(),null));
        assertThat(reservations.byId(secondHold).get("status")).isEqualTo("WAITING");
        loans.returnLoan(librarian,loanId,f.barcode(),null);
        assertThat(reservations.byId(secondHold).get("status")).isEqualTo("READY");
        assertThat(reservations.byId(thirdHold).get("status")).isEqualTo("WAITING");
        reservations.cancel(second,false,secondHold,null,null);
        assertThat(reservations.byId(thirdHold).get("status")).isEqualTo("READY");
        jdbc.update("UPDATE reservations SET pickup_deadline=? WHERE id=?",LocalDate.now(Rows.SHANGHAI).minusDays(1),thirdHold);
        reservations.expireBook(f.bookId());reservations.expireBook(f.bookId());
        assertThat(reservations.byId(thirdHold).get("status")).isEqualTo("EXPIRED");
        assertThat(inventory.byId(f.copyId()).get("status")).isEqualTo("AVAILABLE");
    }
    @Test void overdueBlocksActionsAndReturnReleasesBlock() {
        Fixture f=book();Fixture other=book();long reader=insertUser("READER","T"+UUID.randomUUID());
        long loanId=Rows.id(loans.checkout(librarian,reader,f.barcode(),null));
        jdbc.update("UPDATE loans SET due_date=? WHERE id=?",LocalDate.now(Rows.SHANGHAI).minusDays(1),loanId);
        assertThatThrownBy(() -> reservations.create(reader,other.bookId(),null)).isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException)ex).code()).isEqualTo("OVERDUE_BLOCKED"));
        assertThatThrownBy(() -> loans.renew(reader,loanId,null)).isInstanceOf(ApiException.class);
        loans.returnLoan(librarian,loanId,f.barcode(),null);
        assertThat(reservations.create(reader,other.bookId(),null).get("status")).isEqualTo("READY");
    }
    @Test void idempotencyAndVersionConflict() {
        Fixture f=book();long reader=insertUser("READER","T"+UUID.randomUUID());String key=UUID.randomUUID().toString();
        Map<String,Object> first=loans.checkout(librarian,reader,f.barcode(),key);
        assertThat(loans.checkout(librarian,reader,f.barcode(),key).get("id").toString()).isEqualTo(first.get("id").toString());
        assertThatThrownBy(() -> loans.checkout(librarian,reader,"different",key)).isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException)ex).code()).isEqualTo("IDEMPOTENCY_CONFLICT"));
        assertThatThrownBy(() -> loans.checkout(librarian,Long.MAX_VALUE,f.barcode(),key)).isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException)ex).code()).isEqualTo("IDEMPOTENCY_CONFLICT"));
        assertThatThrownBy(() -> inventory.update(f.copyId(),"B-2","MAINTENANCE",0,librarian)).isInstanceOf(ApiException.class);
    }
    @Test void legacyCheckoutHashesReplayRegardlessOfMapFieldOrdering() throws Exception {
        Fixture f=book();long reader=insertUser("READER","T"+UUID.randomUUID());String key=UUID.randomUUID().toString();
        Map<String,Object> original=loans.checkout(librarian,reader,f.barcode(),key);
        for(boolean reverse:List.of(false,true)) {
            Map<String,Object> payload=new LinkedHashMap<>();
            if(reverse) {payload.put("readerId",reader);payload.put("copyBarcode",f.barcode());}
            else {payload.put("copyBarcode",f.barcode());payload.put("readerId",reader);}
            String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsBytes(payload)));
            jdbc.update("UPDATE idempotency_records SET request_hash=? WHERE actor_id=? AND idempotency_key=?",hash,librarian,key);
            assertThat(loans.checkout(librarian,reader,f.barcode(),key).get("id").toString()).isEqualTo(original.get("id").toString());
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM loans WHERE copy_id=?",Integer.class,f.copyId())).isEqualTo(1);
    }
    @Test void sessionCsrfAndRoleContract() throws Exception {
        assertError(mvc.perform(get("/api/v1/users")).andReturn(),401,"AUTH_REQUIRED");
        assertError(mvc.perform(get("/api/v1/books/9223372036854775807")).andReturn(),404,"NOT_FOUND");
        assertError(mvc.perform(get("/api/v1/books?page=0")).andReturn(),400,"VALIDATION_ERROR");
        MvcResult initial=mvc.perform(get("/api/v1/auth/csrf")).andReturn();
        assertThat(initial.getResponse().getStatus()).isEqualTo(200);
        String token=json.readTree(initial.getResponse().getContentAsString()).path("data").path("csrfToken").asText();
        Cookie cookie=initial.getResponse().getCookie("XSRF-TOKEN");assertThat(cookie).isNotNull();
        String username=(String)users.raw(admin).get("username");
        String body=json.writeValueAsString(Map.of("username",username,"password",adminPassword,"portalRole","ADMIN"));
        String wrongPortal=json.writeValueAsString(Map.of("username",username,"password",adminPassword,"portalRole","READER"));
        assertError(mvc.perform(post("/api/v1/auth/login").cookie(cookie).header("X-XSRF-TOKEN",token)
            .contentType(MediaType.APPLICATION_JSON).content(wrongPortal)).andReturn(),401,"INVALID_CREDENTIALS");
        MvcResult login=mvc.perform(post("/api/v1/auth/login").cookie(cookie).header("X-XSRF-TOKEN",token).contentType(MediaType.APPLICATION_JSON).content(body)).andReturn();
        assertThat(login.getResponse().getStatus()).isEqualTo(200);
        MockHttpSession session=(MockHttpSession)login.getRequest().getSession(false);assertThat(session).isNotNull();
        assertThat(mvc.perform(get("/api/v1/auth/me").session(session).cookie(cookie)).andReturn().getResponse().getStatus()).isEqualTo(200);
        assertThat(mvc.perform(get("/api/v1/books").session(session).cookie(cookie)).andReturn().getResponse().getStatus()).isEqualTo(200);
        assertThat(mvc.perform(get("/api/v1/categories").session(session).cookie(cookie)).andReturn().getResponse().getStatus()).isEqualTo(200);
        String code="E"+UUID.randomUUID().toString().substring(0,8);
        String categoryBody=json.writeValueAsString(Map.of("name","状态测试","code",code,"enabled",false,"sortOrder",1));
        MvcResult categoryCreated=mvc.perform(post("/api/v1/categories").session(session).cookie(cookie).header("X-XSRF-TOKEN",token)
            .contentType(MediaType.APPLICATION_JSON).content(categoryBody)).andReturn();
        assertThat(categoryCreated.getResponse().getStatus()).isEqualTo(201);
        assertError(mvc.perform(post("/api/v1/categories").session(session).cookie(cookie).header("X-XSRF-TOKEN",token)
            .contentType(MediaType.APPLICATION_JSON).content(categoryBody)).andReturn(),409,"STATE_CONFLICT");
        String disabledCategoryId=json.readTree(categoryCreated.getResponse().getContentAsString()).path("data").path("id").asText();
        String bookBody=json.writeValueAsString(Map.of("title","不可入库","author","测试作者","categoryId",disabledCategoryId,"enabled",true));
        assertError(mvc.perform(post("/api/v1/books").session(session).cookie(cookie).header("X-XSRF-TOKEN",token)
            .contentType(MediaType.APPLICATION_JSON).content(bookBody)).andReturn(),422,"STATE_CONFLICT");
        String invalidDate=json.writeValueAsString(Map.of("title","日期校验","author","测试作者","categoryId",String.valueOf(category),"enabled",true,"publishedOn","2026-99-99"));
        assertError(mvc.perform(post("/api/v1/books").session(session).cookie(cookie).header("X-XSRF-TOKEN",token)
            .contentType(MediaType.APPLICATION_JSON).content(invalidDate)).andReturn(),400,"VALIDATION_ERROR");
        assertError(mvc.perform(post("/api/v1/auth/logout").session(session).cookie(cookie)).andReturn(),403,"FORBIDDEN");
        assertThat(mvc.perform(post("/api/v1/auth/logout").session(session).cookie(cookie).header("X-XSRF-TOKEN",token)).andReturn().getResponse().getStatus()).isEqualTo(200);
        assertThat(mvc.perform(get("/api/v1/auth/me").session(session).cookie(cookie)).andReturn().getResponse().getStatus()).isEqualTo(401);
    }
    void assertError(MvcResult result,int status,String code) throws Exception {
        assertThat(result.getResponse().getStatus()).isEqualTo(status);
        JsonNode body=json.readTree(result.getResponse().getContentAsString());
        assertThat(body.path("code").asText()).isEqualTo(code);
        assertThat(body.path("data").isNull()).isTrue();
        assertThat(body.path("details").isArray()).isTrue();
        assertThat(body.path("traceId").asText()).isNotBlank();
    }
    @Test void limitsRenewalAndStatisticsReflectDatabase() {
        long reader=insertUser("READER","T"+UUID.randomUUID());
        List<Fixture> fixtures=new ArrayList<>();
        for(int i=0;i<6;i++) fixtures.add(book());
        List<Long> loanIds=new ArrayList<>();
        for(int i=0;i<5;i++) loanIds.add(Rows.id(loans.checkout(librarian,reader,fixtures.get(i).barcode(),null)));
        assertThatThrownBy(() -> loans.checkout(librarian,reader,fixtures.get(5).barcode(),null))
            .isInstanceOf(ApiException.class).satisfies(ex -> assertThat(((ApiException)ex).code()).isEqualTo("BORROW_LIMIT_REACHED"));
        long first=loanIds.get(0);
        String oldDue=String.valueOf(loans.byId(first).get("dueDate"));
        Map<String,Object> renewed=loans.renew(reader,first,null);
        assertThat(renewed.get("dueDate")).isEqualTo(LocalDate.parse(oldDue).plusDays(15).toString());
        assertThatThrownBy(() -> loans.renew(reader,first,null)).isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException)ex).code()).isEqualTo("RENEWAL_NOT_ALLOWED"));
        Map<String,Object> overview=statistics.overview();
        assertThat(((Number)overview.get("activeLoans")).longValue())
            .isEqualTo(jdbc.queryForObject("SELECT COUNT(*) FROM loans WHERE status='ACTIVE'",Long.class));
        assertThat(((Number)overview.get("readyReservations")).longValue())
            .isEqualTo(jdbc.queryForObject("SELECT COUNT(*) FROM reservations WHERE status='READY'",Long.class));
        assertThat(statistics.topBooks(30,100)).anySatisfy(row -> assertThat(((Number)row.get("bookId")).longValue()).isEqualTo(fixtures.get(0).bookId()));
    }
    @Test void reservationLimitAndAccountGuards() {
        long reader=insertUser("READER","T"+UUID.randomUUID());
        List<Fixture> fixtures=new ArrayList<>();for(int i=0;i<4;i++) fixtures.add(book());
        for(int i=0;i<3;i++) reservations.create(reader,fixtures.get(i).bookId(),null);
        assertThatThrownBy(() -> reservations.create(reader,fixtures.get(3).bookId(),null))
            .isInstanceOf(ApiException.class).satisfies(ex -> assertThat(((ApiException)ex).code()).isEqualTo("RESERVATION_LIMIT_REACHED"));
        assertThatThrownBy(() -> userWorkflow.update(admin,admin,null,null,"DISABLED"))
            .isInstanceOf(ApiException.class).satisfies(ex -> assertThat(((ApiException)ex).code()).isEqualTo("STATE_CONFLICT"));
        userWorkflow.update(admin,reader,null,null,"DISABLED");
        assertThat(users.publicUser(reader).get("status")).isEqualTo("DISABLED");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM reservations WHERE reader_id=? AND status IN ('WAITING','READY')",Integer.class,reader)).isZero();
        long otherAdmin=insertUser("ADMIN","T"+UUID.randomUUID());
        userWorkflow.update(admin,otherAdmin,null,null,"DISABLED");
        assertThatThrownBy(() -> userWorkflow.update(otherAdmin,admin,null,null,"DISABLED"))
            .isInstanceOf(ApiException.class).satisfies(ex -> assertThat(((ApiException)ex).code()).isEqualTo("STATE_CONFLICT"));
    }
    @Test void passwordChangeGateAndDisabledSession() throws Exception {
        String password="T"+UUID.randomUUID(); long staff=insertUser("LIBRARIAN",password);
        users.resetPassword(admin,staff,password);
        MvcResult csrf=mvc.perform(get("/api/v1/auth/csrf")).andReturn();
        String token=json.readTree(csrf.getResponse().getContentAsString()).path("data").path("csrfToken").asText();
        Cookie cookie=csrf.getResponse().getCookie("XSRF-TOKEN");
        String username=String.valueOf(users.raw(staff).get("username"));
        MvcResult login=mvc.perform(post("/api/v1/auth/login").cookie(cookie).header("X-XSRF-TOKEN",token)
            .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("username",username,"password",password,"portalRole","LIBRARIAN")))).andReturn();
        assertThat(login.getResponse().getStatus()).isEqualTo(200);
        MockHttpSession session=(MockHttpSession)login.getRequest().getSession(false);
        MvcResult blocked=mvc.perform(get("/api/v1/stats/overview").session(session).cookie(cookie)).andReturn();
        assertThat(blocked.getResponse().getStatus()).isEqualTo(403);
        assertThat(json.readTree(blocked.getResponse().getContentAsString()).path("code").asText()).isEqualTo("PASSWORD_CHANGE_REQUIRED");
        assertThat(mvc.perform(get("/api/v1/auth/me").session(session).cookie(cookie)).andReturn().getResponse().getStatus()).isEqualTo(200);
        userWorkflow.update(admin,staff,null,null,"DISABLED");
        MvcResult disabled=mvc.perform(get("/api/v1/auth/me").session(session).cookie(cookie)).andReturn();
        assertThat(disabled.getResponse().getStatus()).isEqualTo(403);
        assertThat(json.readTree(disabled.getResponse().getContentAsString()).path("code").asText()).isEqualTo("ACCOUNT_DISABLED");
    }
}
