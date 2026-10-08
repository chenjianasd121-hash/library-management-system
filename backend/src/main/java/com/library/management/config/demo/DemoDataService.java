package com.library.management.config.demo;

import com.library.management.common.Rows;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @Profile("demo")
public class DemoDataService {
    private final DemoMapper mapper;
    private final PasswordEncoder encoder;
    private final String adminPassword,librarianPassword,readerPassword;
    public DemoDataService(DemoMapper mapper,PasswordEncoder encoder,
      @Value("${library.demo.admin-password:}") String adminPassword,
      @Value("${library.demo.librarian-password:}") String librarianPassword,
      @Value("${library.demo.reader-password:}") String readerPassword) {
        this.mapper=mapper;this.encoder=encoder;this.adminPassword=adminPassword;this.librarianPassword=librarianPassword;this.readerPassword=readerPassword;
    }
    @Transactional public void seed() {
        if(mapper.userCount()>0) return;
        if(adminPassword.length()<8 || librarianPassword.length()<8 || readerPassword.length()<8)
            throw new IllegalStateException("demo profile requires DEMO_ADMIN_PASSWORD, DEMO_LIBRARIAN_PASSWORD and DEMO_READER_PASSWORD (8+ characters)");
        long admin=user("demo_admin","演示管理员","ADMIN",adminPassword);
        long librarian=user("demo_librarian","演示馆员","LIBRARIAN",librarianPassword);
        long reader=user("demo_reader","演示读者","READER",readerPassword);
        long reader2=user("demo_reader2","演示读者二","READER",readerPassword);
        String[] names={"文学","历史","科学","计算机","艺术"};long[] categories=new long[5];
        for(int i=0;i<5;i++) {Map<String,Object> row=new LinkedHashMap<>();row.put("name",names[i]);row.put("code","DEMO_"+(i+1));row.put("sortOrder",i+1);mapper.category(row);categories[i]=((Number)row.get("id")).longValue();}
        String[] titles={"平凡的世界","活着","时间简史","人类简史","算法导论","深入理解计算机系统","百年孤独","围城","三体","小王子","红楼梦","西游记","追风筝的人","艺术的故事","设计心理学","万历十五年","枪炮、病菌与钢铁","数学之美","代码大全","瓦尔登湖"};
        long[] books=new long[20],copies=new long[20];
        for(int i=0;i<20;i++) {
            Map<String,Object> b=new LinkedHashMap<>();b.put("title",titles[i]);b.put("author","演示作者 "+(i+1));b.put("categoryId",categories[i%5]);b.put("keywords","演示,馆藏");mapper.book(b);books[i]=((Number)b.get("id")).longValue();
            String status=i==0 || i==4?"BORROWED":i==1?"READY":i==2?"MAINTENANCE":i==3?"RETIRED":"AVAILABLE";
            copies[i]=copy(books[i],"DEMO"+String.format("%05d",i+1),status);
        }
        LocalDate today=LocalDate.now(Rows.SHANGHAI);
        mapper.loan(books[0],copies[0],reader,librarian,today.plusDays(20),"ACTIVE",10);
        mapper.loan(books[4],copies[4],reader,librarian,today.minusDays(8),"ACTIVE",40);
        mapper.loan(books[5],copies[5],reader2,librarian,today.minusDays(20),"RETURNED",60);
        mapper.reservation(books[1],reader,copies[1],"READY",today.plusDays(2));
        mapper.reservation(books[1],reader2,null,"WAITING",null);
        mapper.reservation(books[6],reader2,null,"CANCELLED",null);
        mapper.notice(admin);
    }
    private long user(String username,String displayName,String role,String password) {
        Map<String,Object> row=new LinkedHashMap<>();row.put("username",username);row.put("displayName",displayName);row.put("role",role);row.put("passwordHash",encoder.encode(password));mapper.user(row);return ((Number)row.get("id")).longValue();
    }
    private long copy(long bookId,String barcode,String status) {
        Map<String,Object> row=new LinkedHashMap<>();row.put("bookId",bookId);row.put("barcode",barcode);row.put("shelfLocation","A-"+bookId);row.put("status",status);mapper.copy(row);return ((Number)row.get("id")).longValue();
    }
}
