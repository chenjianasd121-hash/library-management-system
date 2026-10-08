package com.library.management.inventory.service;

import com.library.management.common.ApiException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CoverService {
    private final Path directory;
    public CoverService(@Value("${library.covers-directory}") String directory) { this.directory=Path.of(directory).toAbsolutePath().normalize(); }
    public Map<String,String> upload(MultipartFile file) {
        try {
            byte[] data=file.getBytes();
            if(data.length==0 || data.length>2*1024*1024) throw ApiException.bad("VALIDATION_ERROR","封面大小须在 2 MiB 以内");
            String extension=detect(data);
            if(extension==null) throw ApiException.bad("VALIDATION_ERROR","仅支持 JPEG、PNG 或 WebP 图片");
            Files.createDirectories(directory);
            String name=UUID.randomUUID().toString().replace("-","")+"."+extension;
            Path target=directory.resolve(name).normalize();
            if(!target.startsWith(directory)) throw ApiException.bad("VALIDATION_ERROR","文件名不合法");
            Files.write(target,data,StandardOpenOption.CREATE_NEW);
            return Map.of("coverPath","/api/v1/media/covers/"+name);
        } catch(IOException ex) { throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,"STORAGE_ERROR","封面保存失败"); }
    }
    public ResponseEntity<Resource> read(String opaqueName) {
        if(!opaqueName.matches("[0-9a-f]{32}\\.(jpg|png|webp)")) throw ApiException.notFound();
        Path path=directory.resolve(opaqueName).normalize();
        if(!path.startsWith(directory) || !Files.isRegularFile(path)) throw ApiException.notFound();
        try {
            String extension=detect(Files.readAllBytes(path));
            if(extension==null || !opaqueName.endsWith("."+extension)) throw ApiException.notFound();
            MediaType type=switch(extension) { case "jpg" -> MediaType.IMAGE_JPEG; case "png" -> MediaType.IMAGE_PNG; default -> MediaType.parseMediaType("image/webp"); };
            return ResponseEntity.ok().contentType(type).header("X-Content-Type-Options","nosniff").body(new UrlResource(path.toUri()));
        } catch(IOException ex) { throw ApiException.notFound(); }
    }
    static String detect(byte[] d) {
        if(d.length>=3 && (d[0]&255)==255 && (d[1]&255)==216 && (d[2]&255)==255) return "jpg";
        if(d.length>=8 && (d[0]&255)==137 && d[1]==80 && d[2]==78 && d[3]==71 && d[4]==13 && d[5]==10 && d[6]==26 && d[7]==10) return "png";
        if(d.length>=12 && d[0]=='R' && d[1]=='I' && d[2]=='F' && d[3]=='F' && d[8]=='W' && d[9]=='E' && d[10]=='B' && d[11]=='P') return "webp";
        return null;
    }
}
